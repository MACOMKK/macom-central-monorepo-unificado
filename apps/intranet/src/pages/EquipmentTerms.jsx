import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PDFDocument } from 'pdf-lib';
import { embedSignatureImage, stampSignature } from '@macom/pdf-signature';
import { FileSignature, Monitor, PenLine } from 'lucide-react';
import { Button, Skeleton } from '@macom/ui';

import { appClient } from '@/api/client';

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
  celular: 'Celular',
  periferico: 'Periferico',
  rede: 'Rede',
  outros: 'Outros',
  outro: 'Outros',
};

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('pt-BR');
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const [, base64 = ''] = result.split(',');
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Nao foi possivel processar o PDF assinado.'));
    reader.readAsDataURL(blob);
  });
}

export default function EquipmentTerms() {
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ['current-profile'],
    queryFn: async () => {
      const rows = await appClient.entities.Profile.list();
      return rows[0] || null;
    },
  });

  const termsQuery = useQuery({
    queryKey: ['possession-terms'],
    queryFn: () => appClient.possessionTerms.list(),
  });

  const profile = profileQuery.data;
  const terms = termsQuery.data || [];
  const hasSignature = Boolean(profile?.signature_url);

  const signMutation = useMutation({
    mutationFn: async (term) => {
      if (!profile?.signature_url) {
        throw new Error('Cadastre sua assinatura no Perfil antes de assinar.');
      }
      if (!term.download_url || !term.colaborador_anchor) {
        throw new Error('Nao foi possivel carregar o termo. Tente novamente em instantes.');
      }

      const pdfResponse = await fetch(term.download_url);
      if (!pdfResponse.ok) {
        throw new Error('Nao foi possivel baixar o termo para assinatura.');
      }
      const arrayBuffer = await pdfResponse.arrayBuffer();

      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const signatureImage = await embedSignatureImage(pdfDoc, profile.signature_url);
      await stampSignature(pdfDoc, {
        ...term.colaborador_anchor,
        signatureImage,
        signerName: profile.name,
        signedAt: new Date().toISOString(),
        empresaNome: 'MACOM',
      });

      const signedBytes = await pdfDoc.save();
      const pdfBase64 = await blobToBase64(new Blob([signedBytes], { type: 'application/pdf' }));

      return appClient.possessionTerms.sign({ termoId: term.id, pdfBase64 });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['possession-terms'] });
      toast.success('Termo assinado com sucesso!');
    },
    onError: (error) => {
      toast.error(error.message || 'Nao foi possivel assinar o termo.');
    },
  });

  const isLoading = profileQuery.isLoading || termsQuery.isLoading;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Termo de Equipamento</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Assine digitalmente o termo de responsabilidade dos equipamentos recebidos, usando a
          assinatura cadastrada no seu Perfil.
        </p>
      </div>

      {!hasSignature && !profileQuery.isLoading && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Voce ainda nao cadastrou sua assinatura.{' '}
          <Link to="/perfil" className="font-semibold underline underline-offset-2">
            Cadastre no seu Perfil
          </Link>{' '}
          antes de assinar um termo.
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, item) => (
            <Skeleton key={item} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : terms.length === 0 ? (
        <div className="rounded-[28px] border border-slate-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <FileSignature className="h-6 w-6 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800">Nenhum termo pendente</h3>
          <p className="mt-2 text-sm text-slate-500">
            Voce nao possui termos de equipamento aguardando assinatura no momento.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {terms.map((term) => {
            const isSigning = signMutation.isPending && signMutation.variables?.id === term.id;

            return (
              <div
                key={term.id}
                className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                    <Monitor className="h-4.5 w-4.5 text-slate-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800">{term.ativo_nome || 'Equipamento'}</p>
                    <p className="text-xs text-slate-500">
                      {categoryLabels[term.ativo_categoria] || term.ativo_categoria || 'Equipamento'}
                      {term.ativo_patrimonio ? ` · ${term.ativo_patrimonio}` : ''}
                      {term.ativo_numero_serie ? ` · ${term.ativo_numero_serie}` : ''}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">Gerado em {formatDate(term.gerado_em)}</p>
                  </div>
                </div>

                <Button
                  className="gap-2 sm:w-auto"
                  onClick={() => signMutation.mutate(term)}
                  disabled={!hasSignature || signMutation.isPending}
                >
                  <PenLine className="h-4 w-4" />
                  {isSigning ? 'Assinando...' : 'Assinar'}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
