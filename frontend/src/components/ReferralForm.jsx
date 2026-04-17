import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import axios from 'axios';
import { Stethoscope, Ear, TestTubes, CheckCircle2, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

const API = process.env.REACT_APP_BACKEND_URL || '/api';

const formSchema = z.object({
  empresa: z.string().min(1, 'Empresa é obrigatória'),
  funcionario: z.string().min(1, 'Nome do funcionário é obrigatório'),
  funcao: z.string().min(1, 'Função é obrigatória'),
  tipo_aso: z.string().min(1, 'Selecione o tipo de ASO'),
  audiometria: z.boolean(),
  laboratorio: z.array(z.string()),
  autorizado_por: z.string().min(1, 'Autorização é obrigatória'),
});

const ReferralForm = () => {
  const [selectedAso, setSelectedAso] = useState('');
  const [audiometria, setAudiometria] = useState(false);
  const [selectedLab, setSelectedLab] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
  } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      empresa: '',
      funcionario: '',
      funcao: '',
      tipo_aso: '',
      audiometria: false,
      laboratorio: [],
      autorizado_por: '',
    },
  });

  const asoTypes = [
    { id: 'admissional', label: 'Admissional' },
    { id: 'retorno', label: 'Retorno ao Trabalho' },
    { id: 'periodico', label: 'Periódico' },
    { id: 'mudanca', label: 'Mudança de Função' },
    { id: 'demissional', label: 'Demissional' },
  ];

  const labExams = [
    { id: 'hemograma', label: 'Hemograma Completo' },
    { id: 'sumario', label: 'Sumário de Urina' },
    { id: 'parasitologico', label: 'Parasitológico de Fezes' },
    { id: 'coprocultura', label: 'Coprocultura' },
    { id: 'beta', label: 'Beta' },
    { id: 'glicemia', label: 'Glicemia' },
  ];

  const handleAsoSelect = (type) => {
    setSelectedAso(type);
    setValue('tipo_aso', type);
  };

  const handleAudiometriaToggle = () => {
    const newValue = !audiometria;
    setAudiometria(newValue);
    setValue('audiometria', newValue);
  };

  const handleLabToggle = (examId) => {
    const newSelected = selectedLab.includes(examId)
      ? selectedLab.filter((id) => id !== examId)
      : [...selectedLab, examId];
    setSelectedLab(newSelected);
    setValue('laboratorio', newSelected);
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      const response = await axios.post(`${API}/referral`, data);
      console.log('Form submitted:', response.data);
      setIsSuccess(true);
      reset();
      setSelectedAso('');
      setAudiometria(false);
      setSelectedLab([]);
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Erro ao enviar formulário. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
        <div className="text-center space-y-6 animate-in fade-in duration-500">
          <div className="flex justify-center">
            <div className="bg-[#10B981] rounded-full p-6 animate-in zoom-in duration-300">
              <CheckCircle2 className="w-16 h-16 text-white" />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-[#0A192F]" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Formulário Enviado!
            </h2>
            <p className="text-lg text-[#64748B]">
              Obrigado! O encaminhamento foi enviado com sucesso para a clínica.
            </p>
          </div>
          <Button
            data-testid="new-referral-button"
            onClick={() => setIsSuccess(false)}
            className="h-12 px-8 bg-[#0A192F] hover:bg-[#0F766E] text-white font-semibold transition-colors duration-200"
          >
            Novo Encaminhamento
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-4xl mx-auto p-6 lg:p-12">
        <div className="mb-8 flex justify-center">
          <img
            src="https://customer-assets.emergentagent.com/job_d03b0202-fa49-409a-b41c-70fcf31e4cc9/artifacts/ukm007fv_image.png"
            alt="Qualité MT"
            className="w-64 lg:w-80"
          />
        </div>

        <div className="mb-8">
          <h2
            className="text-3xl lg:text-4xl font-bold text-[#0A192F] tracking-tight"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            Novo Encaminhamento
          </h2>
          <p className="mt-2 text-[#64748B]">
            Preencha os dados abaixo para solicitar os exames necessários.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-sm p-8 space-y-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#64748B] mb-4">
                Informações do Funcionário
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="empresa" className="text-sm font-semibold text-[#0A192F]">
                  Empresa *
                </Label>
                <Input
                  data-testid="input-empresa"
                  id="empresa"
                  {...register('empresa')}
                  className="mt-1.5 h-12 rounded-lg border-slate-300 focus:ring-2 focus:ring-[#0F766E] focus:border-transparent"
                  placeholder="Nome da empresa"
                />
                {errors.empresa && (
                  <p className="text-sm text-[#EF4444] mt-1">{errors.empresa.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="funcionario" className="text-sm font-semibold text-[#0A192F]">
                  Funcionário *
                </Label>
                <Input
                  data-testid="input-funcionario"
                  id="funcionario"
                  {...register('funcionario')}
                  className="mt-1.5 h-12 rounded-lg border-slate-300 focus:ring-2 focus:ring-[#0F766E] focus:border-transparent"
                  placeholder="Nome completo do funcionário"
                />
                {errors.funcionario && (
                  <p className="text-sm text-[#EF4444] mt-1">{errors.funcionario.message}</p>
                )}
              </div>
              <div>
                <Label htmlFor="funcao" className="text-sm font-semibold text-[#0A192F]">
                  Função *
                </Label>
                <Input
                  data-testid="input-funcao"
                  id="funcao"
                  {...register('funcao')}
                  className="mt-1.5 h-12 rounded-lg border-slate-300 focus:ring-2 focus:ring-[#0F766E] focus:border-transparent"
                  placeholder="Cargo ou função"
                />
                {errors.funcao && (
                  <p className="text-sm text-[#EF4444] mt-1">{errors.funcao.message}</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-sm p-8 space-y-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#64748B] mb-2">
                Tipo de ASO
              </p>
              <div className="flex items-center gap-2 text-[#0A192F]">
                <Stethoscope className="w-5 h-5" />
                <span className="font-semibold">Atestado de Saúde Ocupacional *</span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {asoTypes.map((type) => (
                <div
                  key={type.id}
                  data-testid={`aso-card-${type.id}`}
                  onClick={() => handleAsoSelect(type.label)}
                  className={`
                    border rounded-lg p-4 cursor-pointer transition-all duration-200
                    hover:-translate-y-0.5 hover:shadow-md
                    ${
                      selectedAso === type.label
                        ? 'border-[#0F766E] bg-teal-50 text-[#0F766E]'
                        : 'border-slate-200 bg-white text-[#0A192F]'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedAso === type.label ? 'border-[#0F766E]' : 'border-slate-300'
                      }`}
                    >
                      {selectedAso === type.label && (
                        <div className="w-3 h-3 rounded-full bg-[#0F766E]" />
                      )}
                    </div>
                    <span className="font-medium">{type.label}</span>
                  </div>
                </div>
              ))}
            </div>
            {errors.tipo_aso && (
              <p className="text-sm text-[#EF4444]">{errors.tipo_aso.message}</p>
            )}
          </div>

          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-sm p-8 space-y-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#64748B] mb-2">
                Exames Complementares
              </p>
              <div className="flex items-center gap-2 text-[#0A192F]">
                <Ear className="w-5 h-5" />
                <span className="font-semibold">Audiometria</span>
              </div>
            </div>
            <div
              data-testid="audiometria-card"
              onClick={handleAudiometriaToggle}
              className={`
                border rounded-lg p-5 cursor-pointer transition-all duration-200
                hover:-translate-y-0.5 hover:shadow-md
                ${
                  audiometria
                    ? 'border-[#0F766E] bg-teal-50'
                    : 'border-slate-200 bg-white'
                }
              `}
            >
              <div className="flex items-center justify-between">
                <span className={`font-medium ${
                  audiometria ? 'text-[#0F766E]' : 'text-[#0A192F]'
                }`}>
                  Realizar exame de Audiometria
                </span>
                <div
                  className={`w-12 h-6 rounded-full transition-colors ${
                    audiometria ? 'bg-[#0F766E]' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`w-5 h-5 mt-0.5 rounded-full bg-white transition-transform ${
                      audiometria ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-sm p-8 space-y-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#64748B] mb-2">
                Exames Laboratoriais
              </p>
              <div className="flex items-center gap-2 text-[#0A192F]">
                <TestTubes className="w-5 h-5" />
                <span className="font-semibold">Selecione os exames necessários</span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {labExams.map((exam) => (
                <div
                  key={exam.id}
                  data-testid={`lab-card-${exam.id}`}
                  onClick={() => handleLabToggle(exam.label)}
                  className={`
                    border rounded-lg p-4 cursor-pointer transition-all duration-200
                    hover:-translate-y-0.5 hover:shadow-md
                    ${
                      selectedLab.includes(exam.label)
                        ? 'border-[#0F766E] bg-teal-50 text-[#0F766E]'
                        : 'border-slate-200 bg-white text-[#0A192F]'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        selectedLab.includes(exam.label)
                          ? 'border-[#0F766E] bg-[#0F766E]'
                          : 'border-slate-300'
                      }`}
                    >
                      {selectedLab.includes(exam.label) && (
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <span className="font-medium">{exam.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-sm p-8 space-y-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#64748B] mb-4">
                Autorização
              </p>
            </div>
            <div>
              <Label htmlFor="autorizado_por" className="text-sm font-semibold text-[#0A192F]">
                Autorizado por *
              </Label>
              <Input
                data-testid="input-autorizado-por"
                id="autorizado_por"
                {...register('autorizado_por')}
                className="mt-1.5 h-12 rounded-lg border-slate-300 focus:ring-2 focus:ring-[#0F766E] focus:border-transparent"
                placeholder="Nome do responsável pela autorização"
              />
              {errors.autorizado_por && (
                <p className="text-sm text-[#EF4444] mt-1">{errors.autorizado_por.message}</p>
              )}
            </div>
          </div>

          <Button
            data-testid="submit-button"
            type="submit"
            disabled={isSubmitting}
            className="w-full h-14 text-lg font-bold bg-[#0A192F] hover:bg-[#0F766E] text-white transition-colors duration-200"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              'Enviar Encaminhamento'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ReferralForm;