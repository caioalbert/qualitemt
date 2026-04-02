from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import asyncio
import resend

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Resend configuration
resend.api_key = os.environ.get('RESEND_API_KEY')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
CLINIC_EMAIL = os.environ.get('CLINIC_EMAIL', 'contato@qualitemt.com.br')

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

class ReferralForm(BaseModel):
    empresa: str
    funcionario: str
    funcao: str
    tipo_aso: str
    audiometria: bool
    laboratorio: List[str]
    autorizado_por: str

class ReferralFormStored(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    empresa: str
    funcionario: str
    funcao: str
    tipo_aso: str
    audiometria: bool
    laboratorio: List[str]
    autorizado_por: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks

@api_router.post("/referral")
async def submit_referral(form_data: ReferralForm):
    try:
        # Save to database
        referral_stored = ReferralFormStored(**form_data.model_dump())
        doc = referral_stored.model_dump()
        doc['timestamp'] = doc['timestamp'].isoformat()
        
        await db.referrals.insert_one(doc)
        
        # Prepare email content
        laboratorio_items = "\n".join([f"<li>{item}</li>" for item in form_data.laboratorio]) if form_data.laboratorio else "<li>Nenhum exame selecionado</li>"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #0A192F; color: white; padding: 20px; text-align: center; }}
                .content {{ background-color: #f8f9fa; padding: 20px; }}
                .field {{ margin-bottom: 15px; }}
                .label {{ font-weight: bold; color: #0A192F; }}
                .value {{ color: #333; }}
                .section {{ background-color: white; padding: 15px; margin: 10px 0; border-left: 4px solid #0F766E; }}
                ul {{ padding-left: 20px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>Novo Formulário de Encaminhamento</h2>
                    <p>Qualité MT - Medicina e Segurança do Trabalho</p>
                </div>
                <div class="content">
                    <div class="section">
                        <h3 style="color: #0A192F; margin-top: 0;">Informações do Funcionário</h3>
                        <div class="field">
                            <span class="label">Empresa:</span>
                            <span class="value">{form_data.empresa}</span>
                        </div>
                        <div class="field">
                            <span class="label">Funcionário:</span>
                            <span class="value">{form_data.funcionario}</span>
                        </div>
                        <div class="field">
                            <span class="label">Função:</span>
                            <span class="value">{form_data.funcao}</span>
                        </div>
                    </div>
                    
                    <div class="section">
                        <h3 style="color: #0A192F; margin-top: 0;">Tipo de ASO</h3>
                        <div class="field">
                            <span class="value">{form_data.tipo_aso}</span>
                        </div>
                    </div>
                    
                    <div class="section">
                        <h3 style="color: #0A192F; margin-top: 0;">Exames Complementares</h3>
                        <div class="field">
                            <span class="label">Audiometria:</span>
                            <span class="value">{'Sim' if form_data.audiometria else 'Não'}</span>
                        </div>
                    </div>
                    
                    <div class="section">
                        <h3 style="color: #0A192F; margin-top: 0;">Exames Laboratoriais</h3>
                        <ul>
                            {laboratorio_items}
                        </ul>
                    </div>
                    
                    <div class="section">
                        <h3 style="color: #0A192F; margin-top: 0;">Autorização</h3>
                        <div class="field">
                            <span class="label">Autorizado por:</span>
                            <span class="value">{form_data.autorizado_por}</span>
                        </div>
                    </div>
                    
                    <div style="margin-top: 20px; padding: 10px; background-color: #e8f5e9; border-left: 4px solid #10B981;">
                        <p style="margin: 0; font-size: 12px; color: #666;">
                            Formulário enviado em: {datetime.now(timezone.utc).strftime('%d/%m/%Y às %H:%M:%S')} UTC
                        </p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Send email using Resend
        params = {
            "from": SENDER_EMAIL,
            "to": [CLINIC_EMAIL],
            "subject": f"Novo Encaminhamento - {form_data.funcionario} ({form_data.empresa})",
            "html": html_content
        }
        
        email_response = await asyncio.to_thread(resend.Emails.send, params)
        
        logger.info(f"Email sent successfully. ID: {email_response.get('id')}")
        
        return {
            "status": "success",
            "message": "Formulário enviado com sucesso!",
            "referral_id": referral_stored.id,
            "email_id": email_response.get('id')
        }
        
    except Exception as e:
        logger.error(f"Error submitting referral: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao enviar formulário: {str(e)}")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()