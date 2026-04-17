const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { Resend } = require('resend');
const { randomUUID } = require('crypto');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection (reuse across serverless invocations)
let isConnected = false;
async function connectDB() {
  if (isConnected) return;
  await mongoose.connect(process.env.MONGO_URL, { dbName: process.env.DB_NAME });
  isConnected = true;
}

const resend = new Resend(process.env.RESEND_API_KEY);
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'onboarding@resend.dev';
const CLINIC_EMAIL = process.env.CLINIC_EMAIL || 'contato@qualitemt.com.br';

// Schemas — guard against model recompilation in serverless
const StatusCheck = mongoose.models.StatusCheck || mongoose.model('StatusCheck', new mongoose.Schema({
  id: { type: String, default: randomUUID },
  client_name: String,
  timestamp: { type: Date, default: Date.now },
}));

const Referral = mongoose.models.Referral || mongoose.model('Referral', new mongoose.Schema({
  id: { type: String, default: randomUUID },
  empresa: String,
  funcionario: String,
  funcao: String,
  tipo_aso: String,
  audiometria: Boolean,
  laboratorio: [String],
  autorizado_por: String,
  timestamp: { type: Date, default: Date.now },
}));

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Hello World' });
});

app.post('/status', async (req, res) => {
  try {
    await connectDB();
    const { client_name } = req.body;
    const doc = await StatusCheck.create({ client_name });
    res.json({ id: doc.id, client_name: doc.client_name, timestamp: doc.timestamp });
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

app.get('/status', async (req, res) => {
  try {
    await connectDB();
    const checks = await StatusCheck.find({}, { _id: 0, __v: 0 });
    res.json(checks);
  } catch (err) {
    res.status(500).json({ detail: err.message });
  }
});

app.post('/referral', async (req, res) => {
  try {
    await connectDB();
    const { empresa, funcionario, funcao, tipo_aso, audiometria, laboratorio, autorizado_por } = req.body;

    if (!empresa || !funcionario || !funcao || !tipo_aso || !autorizado_por) {
      return res.status(422).json({ detail: 'Campos obrigatórios faltando' });
    }

    const referral = await Referral.create({ empresa, funcionario, funcao, tipo_aso, audiometria, laboratorio, autorizado_por });

    const labItems = laboratorio?.length
      ? laboratorio.map(i => `<li>${i}</li>`).join('')
      : '<li>Nenhum exame selecionado</li>';

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
.container{max-width:600px;margin:0 auto;padding:20px}
.header{background-color:#0A192F;color:white;padding:20px;text-align:center}
.section{background-color:white;padding:15px;margin:10px 0;border-left:4px solid #0F766E}
.label{font-weight:bold;color:#0A192F}
</style></head><body><div class="container">
<div class="header"><h2>Novo Formulário de Encaminhamento</h2><p>Qualité MT - Medicina e Segurança do Trabalho</p></div>
<div class="section"><h3 style="color:#0A192F;margin-top:0">Informações do Funcionário</h3>
<p><span class="label">Empresa:</span> ${empresa}</p>
<p><span class="label">Funcionário:</span> ${funcionario}</p>
<p><span class="label">Função:</span> ${funcao}</p></div>
<div class="section"><h3 style="color:#0A192F;margin-top:0">Tipo de ASO</h3><p>${tipo_aso}</p></div>
<div class="section"><h3 style="color:#0A192F;margin-top:0">Exames Complementares</h3>
<p><span class="label">Audiometria:</span> ${audiometria ? 'Sim' : 'Não'}</p></div>
<div class="section"><h3 style="color:#0A192F;margin-top:0">Exames Laboratoriais</h3><ul>${labItems}</ul></div>
<div class="section"><h3 style="color:#0A192F;margin-top:0">Autorização</h3>
<p><span class="label">Autorizado por:</span> ${autorizado_por}</p></div>
<div style="margin-top:20px;padding:10px;background-color:#e8f5e9;border-left:4px solid #10B981">
<p style="margin:0;font-size:12px;color:#666">Formulário enviado em: ${new Date().toLocaleString('pt-BR', { timeZone: 'UTC' })} UTC</p>
</div></div></body></html>`;

    const emailRes = await resend.emails.send({
      from: SENDER_EMAIL,
      to: [CLINIC_EMAIL],
      subject: `Novo Encaminhamento - ${funcionario} (${empresa})`,
      html,
    });

    res.json({ status: 'success', message: 'Formulário enviado com sucesso!', referral_id: referral.id, email_id: emailRes.data?.id });
  } catch (err) {
    res.status(500).json({ detail: `Erro ao enviar formulário: ${err.message}` });
  }
});

module.exports = app;
