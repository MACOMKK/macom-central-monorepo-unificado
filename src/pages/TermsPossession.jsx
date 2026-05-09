import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  CheckCircle2,
  Clock3,
  Download,
  Mail,
  Monitor,
  Search,
  UserRound,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import FeedbackToast from '@/components/ui/feedback-toast';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { catalogApi } from '@/lib/catalogApi';

const statusMeta = {
  sem_termo: {
    label: 'Sem termo',
    className: 'border-border bg-background text-muted-foreground',
    icon: Clock3,
    cardClassName: 'border-border bg-card',
    asideClassName: 'border-border bg-muted/40',
    avatarClassName: 'bg-[#bf1220]/10',
    avatarIconClassName: 'text-[#bf1220]',
  },
  pendente: {
    label: 'Pendente',
    className: 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300',
    icon: Clock3,
    cardClassName: 'border-border bg-card',
    asideClassName: 'border-border bg-muted/40',
    avatarClassName: 'bg-[#bf1220]/10',
    avatarIconClassName: 'text-[#bf1220]',
  },
  assinado: {
    label: 'Termo Assinado',
    className: 'border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300',
    icon: CheckCircle2,
    cardClassName: 'border-emerald-300 bg-card dark:border-emerald-900',
    asideClassName: 'border-border bg-emerald-50 dark:bg-emerald-950/20',
    avatarClassName: 'bg-emerald-100 dark:bg-emerald-950/40',
    avatarIconClassName: 'text-emerald-600',
  },
};

const categoryLabels = {
  notebook: 'Notebook',
  monitor: 'Monitor',
  tv: 'TV',
  desktop: 'Desktop',
  impressora: 'Impressora',
  telefone: 'Telefone',
  headset: 'Headset',
  teclado: 'Teclado',
  mouse: 'Mouse',
  nobreak: 'Nobreak',
  switch: 'Switch',
  roteador: 'Roteador',
  servidor: 'Servidor',
  tablet: 'Tablet',
  outros: 'Outros',
  celular: 'Celular',
  periferico: 'Periferico',
  rede: 'Rede',
  outro: 'Outros',
};

const conditionLabels = {
  novo: 'Novo',
  bom: 'Bom',
  regular: 'Regular',
  ruim: 'Ruim',
  inservivel: 'Inservivel',
};

const LOGO_URL = 'https://res.cloudinary.com/drevbr5eq/image/upload/q_auto/f_auto/v1777603989/logo_vermelha_e2aob2.png';

function formatCpf(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length !== 11) return value || '-';
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('pt-BR');
}

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function sanitizeFileName(value) {
  return String(value || 'termo-posse')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

function buildLatestTermIndex(terms) {
  return terms.reduce((acc, term) => {
    const key = `${term.colaborador_id}:${term.ativo_id}`;
    if (!acc[key]) {
      acc[key] = term;
    }
    return acc;
  }, {});
}

function getCardStatus(assets, latestTermsByAsset) {
  if (!assets.length) return 'sem_termo';

  const activeTerms = assets
    .map((asset) => latestTermsByAsset[asset.id] || null)
    .filter(Boolean);

  if (!activeTerms.length) return 'sem_termo';

  return activeTerms.length === assets.length && activeTerms.every((term) => term.status === 'assinado')
    ? 'assinado'
    : 'pendente';
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const [, base64 = ''] = result.split(',');
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Nao foi possivel converter o PDF para base64.'));
    reader.readAsDataURL(blob);
  });
}

async function generateTermoPDF(employee, assets, options = {}) {
  const doc = new jsPDF({
    unit: 'mm',
    format: 'a4',
  });
  const marginX = 14;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - marginX * 2;
  let y = 18;

  doc.setFillColor(230, 0, 18);
  doc.rect(0, 0, pageWidth, 12, 'F');

  try {
    const logo = await loadImage(LOGO_URL);
    doc.addImage(logo, 'PNG', marginX, 15, 14, 14);
  } catch {}

  y = 23;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(230, 0, 18);
  doc.text('MACOM', marginX + 18, y);

  doc.setFontSize(9.5);
  doc.setTextColor(120, 120, 120);
  doc.setFont('helvetica', 'normal');
  doc.text('MITSUBISHI MOTORS | Gestao de Ativos TI', marginX + 18, y + 6);
  const today = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text(`Belem/PA, ${today}`, pageWidth - marginX, 8, { align: 'right' });

  y = 42;
  doc.setFillColor(245, 245, 245);
  doc.rect(marginX, y - 6, contentWidth, 14, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 30, 30);
  doc.text('TERMO DE RESPONSABILIDADE E POSSE DE EQUIPAMENTO', pageWidth / 2, y + 2, { align: 'center' });

  y = 56;
  doc.setFillColor(230, 0, 18);
  doc.rect(marginX, y, 3, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text('DADOS DO COLABORADOR', marginX + 7, y + 7);

  y += 14;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);

  const employeeData = [
    ['Nome:', employee.full_name || '-'],
    ['CPF:', employee.cpf || '-'],
    ['Email:', employee.email || '-'],
    ['Departamento:', employee.department || '-'],
    ['Cargo:', employee.role || '-'],
  ];

  employeeData.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, marginX + 5, y);
    doc.setFont('helvetica', 'normal');
    doc.text(String(value || '-'), marginX + 40, y);
    y += 5.6;
  });

  y += 5;
  doc.setFillColor(230, 0, 18);
  doc.rect(marginX, y, 3, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text('EQUIPAMENTOS SOB RESPONSABILIDADE', marginX + 7, y + 7);
  y += 13;

  const colWidths = [25, 50, 40, 30, 25];
  const headers = ['Codigo', 'Equipamento', 'N Serie', 'Marca/Modelo', 'Estado'];

  doc.setFillColor(30, 30, 30);
  doc.rect(marginX, y - 4.5, contentWidth, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);

  let x = marginX + 2;
  headers.forEach((header, index) => {
    doc.text(header, x, y);
    x += colWidths[index];
  });

  y += 5.2;
  doc.setTextColor(50, 50, 50);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.3);

  const maxRows = 9;
  const shownAssets = assets.slice(0, maxRows);
  shownAssets.forEach((asset, index) => {
    const bgColor = index % 2 === 0 ? [250, 250, 250] : [255, 255, 255];
    doc.setFillColor(...bgColor);
    doc.rect(marginX, y - 3.4, contentWidth, 6.6, 'F');

    x = marginX + 2;
    const row = [
      asset.tag || '-',
      `${categoryLabels[asset.category] || ''} ${asset.name || ''}`.trim(),
      asset.serial_number || '-',
      `${asset.brand || ''} ${asset.model || ''}`.trim() || '-',
      conditionLabels[asset.condition] || '-',
    ];

    row.forEach((cell, cellIndex) => {
      const text = String(cell || '-');
      const truncated = text.length > 26 ? `${text.substring(0, 24)}...` : text;
      doc.text(truncated, x, y);
      x += colWidths[cellIndex];
    });
    y += 6.6;
  });

  if (assets.length > maxRows) {
    doc.setFontSize(6.5);
    doc.setTextColor(120, 120, 120);
    doc.text(`+ ${assets.length - maxRows} item(ns) adicional(is) resumido(s).`, marginX, y + 2);
    y += 5.2;
  }

  y += 6;
  doc.setFillColor(230, 0, 18);
  doc.rect(marginX, y, 3, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text('TERMOS E CONDICOES', marginX + 7, y + 7);
  y += 13;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(60, 60, 60);

  const terms = [
    '1. O colaborador declara ter recebido o(s) equipamento(s) listado(s) acima em perfeito estado de funcionamento e conservacao.',
    '2. O colaborador compromete-se a zelar pela conservacao e bom uso do(s) equipamento(s), utilizando-o(s) exclusivamente para fins profissionais.',
    '3. E vedada a cessao, emprestimo ou transferencia do(s) equipamento(s) a terceiros sem previa autorizacao da MACOM.',
    '4. Em caso de dano, perda ou furto, o colaborador devera comunicar imediatamente ao departamento de TI.',
    '5. O colaborador compromete-se a devolver o(s) equipamento(s) em bom estado ao termino do vinculo empregaticio ou quando solicitado.',
    '6. O descumprimento deste termo podera acarretar em medidas administrativas e/ou ressarcimento dos valores correspondentes.',
  ];

  terms.forEach((term) => {
    const lines = doc.splitTextToSize(term, contentWidth - 10);
    doc.text(lines, marginX + 5, y);
    y += lines.length * 3.7 + 2.2;
  });

  y += 10;
  const sigY = Math.min(y, pageHeight - 24);
  doc.setDrawColor(180, 180, 180);
  const sigWidth = (contentWidth - 20) / 2;
  doc.line(marginX, sigY, marginX + sigWidth, sigY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 30, 30);
  doc.text(employee.full_name || 'Colaborador', marginX + sigWidth / 2, sigY + 5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(120, 120, 120);
  doc.text('Colaborador', marginX + sigWidth / 2, sigY + 9, { align: 'center' });

  const rightX = marginX + sigWidth + 20;
  doc.line(rightX, sigY, rightX + sigWidth, sigY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 30, 30);
  doc.text('Departamento de TI', rightX + sigWidth / 2, sigY + 5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(120, 120, 120);
  doc.text('MACOM Mitsubishi', rightX + sigWidth / 2, sigY + 9, { align: 'center' });

  const footerY = doc.internal.pageSize.getHeight();
  doc.setFillColor(230, 0, 18);
  doc.rect(0, footerY - 8, pageWidth, 8, 'F');
  doc.setFontSize(6);
  doc.setTextColor(255, 255, 255);
  doc.text('MACOM Mitsubishi Motors - Gestao de Ativos TI', pageWidth / 2, footerY - 3, { align: 'center' });

  const filename = `Termo_${sanitizeFileName(employee.full_name || 'colaborador')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;

  if (options.returnBlob) {
    const blob = doc.output('blob');
    return { blob, filename };
  }

  doc.save(filename);
  return { filename };
}

export default function TermsPossession() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [feedback, setFeedback] = useState(null);

  const collaboratorsQuery = useQuery({ queryKey: ['colaboradores'], queryFn: catalogApi.colaboradores.list });
  const assetsQuery = useQuery({ queryKey: ['ativos'], queryFn: catalogApi.ativos.list });
  const termsQuery = useQuery({ queryKey: ['termos_posse'], queryFn: catalogApi.termos_posse.list });
  const departmentsQuery = useQuery({ queryKey: ['departamentos'], queryFn: catalogApi.departamentos.list });

  const collaborators = collaboratorsQuery.data || [];
  const assets = assetsQuery.data || [];
  const terms = termsQuery.data || [];
  const departments = departmentsQuery.data || [];

  const departmentById = useMemo(
    () => new Map(departments.map((department) => [department.id, department.nome])),
    [departments]
  );

  const collaboratorCards = useMemo(() => {
    const latestTermIndex = buildLatestTermIndex(terms);

    return collaborators
      .map((collaborator) => {
        const linkedAssets = assets
          .filter((asset) => asset.usuario_id === collaborator.id)
          .sort((left, right) => (left.nome || '').localeCompare(right.nome || ''));
        const latestTermsByAsset = linkedAssets.reduce((acc, asset) => {
          acc[asset.id] = latestTermIndex[`${collaborator.id}:${asset.id}`] || null;
          return acc;
        }, {});
        const status = getCardStatus(linkedAssets, latestTermsByAsset);
        const termRows = Object.values(latestTermsByAsset).filter(Boolean);

        return {
          collaborator,
          assets: linkedAssets,
          status,
          latestTermsByAsset,
          termRows,
        };
      })
      .filter((item) => item.assets.length > 0)
      .filter((item) => {
        const haystack = [
          item.collaborator.nome,
          item.collaborator.email,
          item.collaborator.cpf,
          departmentById.get(item.collaborator.departamento_id),
        ]
          .map(normalizeText)
          .join(' ');

        const matchesSearch = !search || haystack.includes(normalizeText(search));
        const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((left, right) => (left.collaborator.nome || '').localeCompare(right.collaborator.nome || ''));
  }, [assets, collaborators, departmentById, search, statusFilter, terms]);

  const ensureTermRows = async (collaborator, linkedAssets, latestTermsByAsset) => {
    const rows = [];

    for (const asset of linkedAssets) {
      const existingTerm = latestTermsByAsset[asset.id];
      if (existingTerm && !['cancelado', 'devolvido'].includes(existingTerm.status)) {
        rows.push(existingTerm);
        continue;
      }

      const createdRow = await catalogApi.termos_posse.create({
        ativo_id: asset.id,
        colaborador_id: collaborator.id,
      });
      rows.push(createdRow);
    }

    return rows;
  };

  const buildPdfPayload = (collaborator, linkedAssets) => {
    const departmentName = departmentById.get(collaborator.departamento_id) || '-';
    const employee = {
      full_name: collaborator.nome || '-',
      cpf: formatCpf(collaborator.cpf),
      email: collaborator.email || '-',
      department: departmentName,
      role: collaborator.cargo || '-',
    };
    const normalizedAssets = linkedAssets.map((asset) => ({
      tag: asset.patrimonio || asset.id?.slice(0, 8) || '-',
      category: asset.categoria || 'outros',
      name: asset.nome || '-',
      serial_number: asset.numero_serie || '-',
      brand: asset.marca || '',
      model: asset.modelo || '',
      condition: asset.estado || 'bom',
    }));

    return { employee, normalizedAssets, departmentName };
  };

  const generatePdfMutation = useMutation({
    mutationFn: async ({ collaborator, assets: linkedAssets, latestTermsByAsset }) => {
      await ensureTermRows(collaborator, linkedAssets, latestTermsByAsset);
      const { employee, normalizedAssets } = buildPdfPayload(collaborator, linkedAssets);

      const result = await generateTermoPDF(employee, normalizedAssets);
      return { collaborator, filename: result.filename };
    },
    onSuccess: ({ collaborator }) => {

      queryClient.invalidateQueries({ queryKey: ['termos_posse'] });
      setFeedback({
        type: 'success',
        message: `PDF gerado com sucesso para ${collaborator.nome || collaborator.email}.`,
      });
    },
    onError: (error) => {
      setFeedback({
        type: 'error',
        message: error.message || 'Nao foi possivel gerar o PDF do termo.',
      });
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: async ({ collaborator, assets: linkedAssets, latestTermsByAsset }) => {
      if (!collaborator.email) {
        throw new Error('Colaborador sem email cadastrado.');
      }

      await ensureTermRows(collaborator, linkedAssets, latestTermsByAsset);
      const { employee, normalizedAssets } = buildPdfPayload(collaborator, linkedAssets);
      const { blob, filename } = await generateTermoPDF(employee, normalizedAssets, { returnBlob: true });
      const pdf_base64 = await blobToBase64(blob);
      const dataAtual = format(new Date(), 'dd/MM/yyyy');

      const subject = `Termo de Responsabilidade e Posse de Equipamento - ${employee.full_name}`;
      const body_text = [
        `Ola, ${employee.full_name}.`,
        '',
        'Segue em anexo o seu termo de responsabilidade referente aos equipamentos de TI vinculados ao seu nome.',
        '',
        'Em caso de duvidas, entre em contato com o time de TI.',
        '',
        'Atenciosamente,',
        'Equipe de TI',
      ].join('\n');
      const body_html = `
        <div style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#111827;">
          <div style="max-width:620px;margin:24px auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
            <div style="background:#c1121f;padding:16px 20px;">
              <p style="margin:0;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:0.18em;line-height:1;font-family:Arial,Helvetica,sans-serif;">
                MACOM
              </p>
            </div>

            <div style="padding:24px 20px;">
              <h2 style="margin:0 0 14px;font-size:21px;font-weight:700;line-height:1.25;color:#111827;font-family:Arial,Helvetica,sans-serif;">
                Termo de Responsabilidade de Ativos de TI
              </h2>

              <p style="margin:0 0 14px;font-size:14px;font-weight:400;line-height:1.65;color:#374151;font-family:Arial,Helvetica,sans-serif;">
                Ola <strong style="font-weight:700;color:#1f2937;">${employee.full_name}</strong>,
              </p>

              <p style="margin:0 0 14px;font-size:14px;font-weight:400;line-height:1.7;color:#374151;font-family:Arial,Helvetica,sans-serif;">
                Segue em anexo o seu termo de responsabilidade referente aos equipamentos de TI vinculados ao seu nome.
              </p>

              <div style="margin:18px 0;padding:12px;border:1px solid #e5e7eb;border-radius:8px;background:#fafafa;">
                <p style="margin:0;font-size:13px;font-weight:400;line-height:1.5;color:#4b5563;font-family:Arial,Helvetica,sans-serif;">
                  <strong style="font-weight:700;color:#374151;">Colaborador:</strong> ${employee.full_name}
                </p>
                <p style="margin:6px 0 0;font-size:13px;font-weight:400;line-height:1.5;color:#4b5563;font-family:Arial,Helvetica,sans-serif;">
                  <strong style="font-weight:700;color:#374151;">Data do envio:</strong> ${dataAtual}
                </p>
              </div>

              <p style="margin:0;font-size:14px;font-weight:400;line-height:1.7;color:#374151;font-family:Arial,Helvetica,sans-serif;">
                Em caso de duvidas, entre em contato com o time de TI.
              </p>
            </div>

            <div style="padding:14px 20px;background:#111827;">
              <p style="margin:0;font-size:12px;font-weight:400;line-height:1.4;color:#e5e7eb;font-family:Arial,Helvetica,sans-serif;">
                MACOM Mitsubishi Motors • Gestao de Ativos de TI
              </p>
            </div>
          </div>
        </div>
      `;

      await catalogApi.email.sendTermoGmail({
        to: collaborator.email,
        subject,
        body_text,
        body_html,
        filename,
        pdf_base64,
      });

      return collaborator;
    },
    onSuccess: (collaborator) => {
      setFeedback({
        type: 'success',
        message: `Email enviado com sucesso para ${collaborator.nome || collaborator.email}.`,
      });
    },
    onError: (error) => {
      setFeedback({
        type: 'error',
        message: error.message || 'Nao foi possivel enviar o termo por email.',
      });
    },
  });

  const markSignedMutation = useMutation({
    mutationFn: async ({ collaborator, assets: linkedAssets, latestTermsByAsset }) => {
      const pendingTerms = linkedAssets
        .map((asset) => latestTermsByAsset[asset.id] || null)
        .filter((term) => term && term.status !== 'assinado');

      if (!pendingTerms.length) {
        throw new Error('Nenhum termo pendente encontrado para este colaborador.');
      }

      const now = new Date().toISOString();
      await Promise.all(
        pendingTerms.map((term) =>
          catalogApi.termos_posse.update(term.id, {
            status: 'assinado',
            assinado_em: now,
          })
        )
      );

      return collaborator;
    },
    onSuccess: (collaborator) => {
      queryClient.invalidateQueries({ queryKey: ['termos_posse'] });
      setFeedback({
        type: 'success',
        message: `Termos marcados como assinados para ${collaborator.nome || collaborator.email}.`,
      });
    },
    onError: (error) => {
      setFeedback({
        type: 'error',
        message: error.message || 'Nao foi possivel marcar os termos como assinados.',
      });
    },
  });

  const isLoading =
    collaboratorsQuery.isLoading ||
    assetsQuery.isLoading ||
    termsQuery.isLoading ||
    departmentsQuery.isLoading;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Termos de Posse</h1>
        <p className="mt-1 text-muted-foreground">Gere o PDF do termo de responsabilidade por colaborador.</p>
      </div>

      <Card className="rounded-2xl border border-border/80 p-4 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar colaborador..."
              className="h-10 rounded-xl border-border pl-10 text-xs"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-10 w-full rounded-xl border-border px-3 text-xs lg:w-[280px]">
              <SelectValue placeholder="Todos os colaboradores" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os colaboradores</SelectItem>
              <SelectItem value="pendente">Pendentes</SelectItem>
              <SelectItem value="assinado">Assinados</SelectItem>
              <SelectItem value="sem_termo">Sem termo</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {isLoading ? (
        <div className="flex min-h-[45vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
        </div>
      ) : collaboratorCards.length === 0 ? (
        <Card className="rounded-2xl p-10 text-center text-sm text-muted-foreground">
          Nenhum colaborador com equipamento vinculado foi encontrado.
        </Card>
      ) : (
        <div className="space-y-4">
          {collaboratorCards.map(({ collaborator, assets: linkedAssets, status, latestTermsByAsset, termRows }) => {
            const departmentName = departmentById.get(collaborator.departamento_id) || 'Sem departamento';
            const statusInfo = statusMeta[status];
            const StatusIcon = statusInfo.icon;
            const isGenerating = generatePdfMutation.isPending && generatePdfMutation.variables?.collaborator?.id === collaborator.id;
            const isSigning = markSignedMutation.isPending && markSignedMutation.variables?.collaborator?.id === collaborator.id;
            const isSending = sendEmailMutation.isPending && sendEmailMutation.variables?.collaborator?.id === collaborator.id;

            return (
              <Card
                key={collaborator.id}
                className={`overflow-hidden rounded-xl border text-card-foreground shadow transition-shadow duration-300 hover:shadow-lg ${statusInfo.cardClassName}`}
              >
                <div className="flex flex-col md:flex-row">
                  <aside className={`p-4 md:w-72 md:border-r ${statusInfo.asideClassName}`}>
                    <div className="mb-3 flex items-center gap-3">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-full ${statusInfo.avatarClassName}`}>
                        {status === 'assinado' ? (
                          <CheckCircle2 className={`h-4 w-4 ${statusInfo.avatarIconClassName}`} />
                        ) : (
                          <UserRound className={`h-4 w-4 ${statusInfo.avatarIconClassName}`} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-foreground">{collaborator.nome || 'Sem nome'}</p>
                        <p className="truncate text-xs text-muted-foreground">{departmentName}</p>
                      </div>
                    </div>

                    <div className={`mb-3 inline-flex items-center gap-1 rounded-md border px-2.5 py-0.5 text-xs ${statusInfo.className}`}>
                      <StatusIcon className="h-3 w-3" />
                      {statusInfo.label}
                    </div>

                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>CPF: {formatCpf(collaborator.cpf)}</p>
                      <p className="break-all">{collaborator.email || '-'}</p>
                      {termRows.length ? (
                        <p>Ultima geracao: {formatDateTime(termRows[0]?.gerado_em)}</p>
                      ) : null}
                    </div>

                    <div className="mt-5 space-y-2">
                      <Button
                        className="h-8 w-full rounded-lg bg-[#d1131f] px-2.5 text-[11px] font-semibold hover:bg-[#b50f1a]"
                        onClick={() => generatePdfMutation.mutate({ collaborator, assets: linkedAssets, latestTermsByAsset })}
                        disabled={isGenerating || isSigning || isSending}
                      >
                        <Download className="mr-1.5 h-3 w-3" />
                        {isGenerating ? 'Gerando PDF...' : 'Gerar Termo PDF'}
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        className="h-8 w-full rounded-lg px-2.5 text-[11px]"
                        onClick={() => sendEmailMutation.mutate({ collaborator, assets: linkedAssets, latestTermsByAsset })}
                        disabled={!collaborator.email || isGenerating || isSigning || isSending}
                      >
                        <Mail className="mr-1.5 h-3 w-3" />
                        {isSending ? 'Enviando...' : 'Enviar por Email'}
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        className="h-8 w-full rounded-lg border-emerald-200 bg-emerald-50 px-2.5 text-[11px] text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-950/50"
                        onClick={() => markSignedMutation.mutate({ collaborator, assets: linkedAssets, latestTermsByAsset })}
                        disabled={isGenerating || isSigning || isSending || !termRows.length || status === 'assinado'}
                      >
                        <CheckCircle2 className="mr-1.5 h-3 w-3" />
                        {isSigning ? 'Atualizando...' : 'Marcar como Assinado'}
                      </Button>
                    </div>
                  </aside>

                  <section className="flex-1 p-4">
                    <p className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {linkedAssets.length} {linkedAssets.length === 1 ? 'equipamento vinculado' : 'equipamentos vinculados'}
                    </p>

                    <div className="space-y-2">
                      {linkedAssets.map((asset) => {
                        const latestTerm = latestTermsByAsset[asset.id];
                        return (
                          <div
                            key={asset.id}
                            className="flex items-center gap-2.5 rounded-lg bg-muted/40 p-2"
                          >
                            <Monitor className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-medium text-foreground">{asset.nome || '-'}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {asset.patrimonio || '-'} · {asset.numero_serie || '-'}
                              </p>
                            </div>

                            <span className="shrink-0 rounded-md border border-border bg-background/60 px-2 py-0.5 text-xs text-foreground">
                              {asset.categoria || 'Equipamento'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <FeedbackToast feedback={feedback} onClose={() => setFeedback(null)} />
    </div>
  );
}
