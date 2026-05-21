import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Building2, Maximize2, Minimize2, Shield } from 'lucide-react';

import { dataClient } from '@/api/dataClient';
import { Button, Skeleton, toast } from '@macom/ui';
import { useAuth } from '@/lib/AuthContext';

export default function ReportViewer() {
  const { user } = useAuth();
  const { id } = useParams();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [fullscreen, setFullscreen] = useState(false);
  const rotateToastRef = useRef(null);
  const previewReport = location.state?.reportPreview || null;

  useEffect(() => {
    const isPortraitOrientation = () => {
      if (window.matchMedia) {
        return window.matchMedia('(orientation: portrait)').matches;
      }
      return window.innerHeight > window.innerWidth;
    };

    const checkOrientation = () => {
      const isMobile = window.innerWidth < 768;
      const isPortrait = isPortraitOrientation();
      const shouldShowHint = isMobile && isPortrait;

      if (shouldShowHint && !rotateToastRef.current) {
        const toastInstance = toast({
          title: 'Melhor visualizacao do grafico',
          description: 'Vire o celular para o modo horizontal.',
        });
        rotateToastRef.current = toastInstance;
      }

      if (!shouldShowHint && rotateToastRef.current) {
        rotateToastRef.current.dismiss();
        rotateToastRef.current = null;
      }
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
      if (rotateToastRef.current) {
        rotateToastRef.current.dismiss();
        rotateToastRef.current = null;
      }
    };
  }, []);

  const { data: report, isLoading } = useQuery({
    queryKey: ['report', id, user?.id, user?.role],
    queryFn: async () => {
      try {
        const reports = await dataClient.entities.Report.filter({ id });
        if (reports[0]) {
          return reports[0];
        }
      } catch {
        // Fallback to the accessible report list when a direct lookup fails.
      }

      const accessibleReports = await dataClient.entities.Report.list();
      return accessibleReports.find((item) => item.id === id) || null;
    },
    enabled: !!id && !!user?.id,
  });

  const { data: notices = [], isLoading: isNoticeLoading } = useQuery({
    queryKey: ['report-notice-active', id, user?.id],
    queryFn: () => dataClient.entities.ReportNotice.filter({ report_id: id, active: true }),
    enabled: !!report?.id && !!user?.id,
  });

  const activeNotice = useMemo(() => notices[0] || null, [notices]);

  const { data: acceptances = [], isLoading: isAcceptanceLoading } = useQuery({
    queryKey: ['report-notice-acceptance', activeNotice?.id, user?.id],
    queryFn: () =>
      dataClient.entities.ReportNoticeAcceptance.filter({
        notice_id: activeNotice.id,
        collaborator_id: user.id,
      }),
    enabled: !!activeNotice?.id && !!user?.id,
  });

  const acceptance = useMemo(() => acceptances[0] || null, [acceptances]);
  const isAdminUser = user?.role === 'admin';

  const acceptNoticeMutation = useMutation({
    mutationFn: () =>
      dataClient.entities.ReportNoticeAcceptance.create({
        notice_id: activeNotice.id,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['report-notice-acceptance', activeNotice?.id, user?.id],
      });
    },
  });

  const noticeRequiresAcceptance = activeNotice?.required !== false;
  const hasAcceptedCurrentVersion =
    (acceptance?.accepted_version || 0) >= (activeNotice?.version || 0);
  const isBlockingStateLoading =
    !isLoading &&
    !!report &&
    !isAdminUser &&
    (isNoticeLoading || (activeNotice && noticeRequiresAcceptance && isAcceptanceLoading));
  const shouldBlockForNotice = Boolean(
    report && activeNotice && !isAdminUser && noticeRequiresAcceptance && !hasAcceptedCurrentVersion
  );

  const iframeSrc = useMemo(() => {
    if (!report?.embed_code) return null;
    const match = report.embed_code.match(/src=["']([^"']+)["']/);
    return match ? match[1] : null;
  }, [report?.embed_code]);

  const headerReport = report || previewReport;

  if (!isLoading && !report) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: '#f2f2f2' }}>
        <div className="bg-white p-10 text-center" style={{ borderLeft: '4px solid #E30613' }}>
          <Shield className="mx-auto mb-4 h-12 w-12" style={{ color: '#E30613' }} />
          <h2 className="mb-2 text-xl font-black uppercase tracking-wider">Relatorio indisponivel</h2>
          <p className="mb-6 text-sm" style={{ color: '#888' }}>
            Voce nao tem permissao para visualizar este relatorio ou ele nao esta mais disponivel.
          </p>
          <Link
            to="/"
            className="inline-block px-6 py-2.5 text-xs font-black uppercase tracking-widest text-white"
            style={{ background: '#E30613' }}
          >
            Voltar
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className={fullscreen ? 'fixed inset-0 z-50 flex flex-col' : 'flex flex-col'}
      style={{ background: '#141414', minHeight: fullscreen ? '100vh' : 'calc(100vh - 0px)' }}
    >
      <div
        className="flex flex-shrink-0 items-center justify-between px-5 py-3"
        style={{ background: '#141414', borderBottom: '2px solid #E30613' }}
      >
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-colors"
            style={{ color: '#888' }}
            onMouseEnter={(event) => {
              event.currentTarget.style.color = '#E30613';
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.color = '#888';
            }}
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
          <div style={{ width: 1, height: 20, background: '#333' }} />
          <div>
            {headerReport ? (
              <>
                <h1 className="text-sm font-black uppercase tracking-widest text-white">{headerReport.title}</h1>
                {headerReport.unit_label ? (
                  <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider" style={{ color: '#E30613' }}>
                    <Building2 className="h-3 w-3" />
                    {headerReport.unit_label}
                  </span>
                ) : null}
              </>
            ) : isLoading ? (
              <>
                <Skeleton className="h-5 w-80 max-w-[55vw] bg-white/10" />
                <Skeleton className="mt-2 h-3 w-40 bg-white/10" />
              </>
            ) : (
              <span className="text-[10px] uppercase tracking-wider text-white/60">Carregando relatorio...</span>
            )}
          </div>
        </div>
        <button
          onClick={() => setFullscreen(!fullscreen)}
          className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all"
          style={{ background: fullscreen ? '#333' : '#E30613', color: '#fff' }}
          onMouseEnter={(event) => {
            if (!fullscreen) event.currentTarget.style.background = '#b80010';
          }}
          onMouseLeave={(event) => {
            if (!fullscreen) event.currentTarget.style.background = '#E30613';
          }}
        >
          {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          {fullscreen ? 'Sair' : 'Tela Cheia'}
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        {isLoading || isBlockingStateLoading ? (
          <div className="p-5 md:p-6" style={{ background: '#f2f2f2', minHeight: fullscreen ? 'calc(100vh - 56px)' : 'calc(100vh - 120px)' }}>
            <Skeleton className="h-full min-h-[70vh] w-full bg-black/10" />
          </div>
        ) : shouldBlockForNotice ? (
          <div
            className="flex items-center justify-center px-5 py-8 md:px-8"
            style={{ background: '#f2f2f2', minHeight: fullscreen ? 'calc(100vh - 56px)' : 'calc(100vh - 120px)' }}
          >
            <div className="w-full max-w-3xl bg-white shadow-sm" style={{ borderTop: '4px solid #E30613' }}>
              <div className="border-b border-slate-200 px-6 py-5">
                <div className="flex items-start gap-4">
                  <div className="rounded-full bg-[#E30613]/10 p-3">
                    <AlertTriangle className="h-5 w-5 text-[#E30613]" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.24em]" style={{ color: '#E30613' }}>
                      Aviso de atualizacao
                    </p>
                    <h2 className="mt-1 text-xl font-black uppercase tracking-wide text-slate-900">
                      {activeNotice.title}
                    </h2>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Leia e confirme antes de abrir este relatorio. Versao {activeNotice.version}
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-6 py-6">
                <div className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{activeNotice.message}</div>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-end">
                <Link
                  to="/"
                  className="inline-flex items-center justify-center px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-600 transition-colors hover:text-slate-900"
                >
                  Voltar
                </Link>
                <Button
                  type="button"
                  onClick={() => acceptNoticeMutation.mutate()}
                  disabled={acceptNoticeMutation.isPending}
                  className="bg-[#E30613] text-white hover:bg-[#b80010]"
                >
                  {acceptNoticeMutation.isPending ? 'Confirmando...' : 'Li e estou ciente'}
                </Button>
              </div>
            </div>
          </div>
        ) : iframeSrc ? (
          <iframe
            title={report.title}
            src={iframeSrc}
            className="h-full w-full border-0"
            style={{ minHeight: fullscreen ? 'calc(100vh - 56px)' : 'calc(100vh - 120px)' }}
            allowFullScreen
          />
        ) : report.embed_code ? (
          <div
            className="h-full w-full"
            style={{ minHeight: 'calc(100vh - 120px)' }}
            dangerouslySetInnerHTML={{ __html: report.embed_code }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm uppercase tracking-widest text-white opacity-40">
            Nenhum codigo embed configurado.
          </div>
        )}
      </div>
    </div>
  );
}
