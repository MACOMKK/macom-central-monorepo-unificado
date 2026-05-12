import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOutletContext, useParams, Link } from 'react-router-dom';
import { dataClient } from '@/api/dataClient';
import { ArrowLeft, Building2, Maximize2, Minimize2, Shield } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';

export default function ReportViewer() {
  const { user } = useOutletContext();
  const { id } = useParams();
  const [fullscreen, setFullscreen] = useState(false);
  const isAdmin = user?.role === 'admin';
  const rotateToastRef = useRef(null);

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
          title: 'Melhor visualização do gráfico',
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
    queryKey: ['report', id],
    queryFn: async () => {
      const reports = await dataClient.entities.Report.filter({ id });
      return reports[0];
    },
  });

  const { data: permissions = [] } = useQuery({
    queryKey: ['permission-check', user?.email, id],
    queryFn: () => dataClient.entities.ReportPermission.filter({ user_email: user?.email, report_id: id }),
    enabled: !!user?.email && !isAdmin,
  });

  const hasAccess = isAdmin || permissions.length > 0;

  const iframeSrc = useMemo(() => {
    if (!report?.embed_code) return null;
    const match = report.embed_code.match(/src=["']([^"']+)["']/);
    return match ? match[1] : null;
  }, [report?.embed_code]);

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8" style={{ background: '#f2f2f2', minHeight: '100vh' }}>
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-[80vh] w-full" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-6 lg:p-8 text-center py-20" style={{ background: '#f2f2f2', minHeight: '100vh' }}>
        <h2 className="text-xl font-black uppercase tracking-wider">Relatório não encontrado</h2>
        <Link to="/" className="text-xs font-bold uppercase tracking-wider mt-4 inline-block" style={{ color: '#E30613' }}>
          ← Voltar ao Dashboard
        </Link>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: '#f2f2f2' }}>
        <div className="text-center bg-white p-10" style={{ borderLeft: '4px solid #E30613' }}>
          <Shield className="w-12 h-12 mx-auto mb-4" style={{ color: '#E30613' }} />
          <h2 className="text-xl font-black uppercase tracking-wider mb-2">Acesso Negado</h2>
          <p className="text-sm mb-6" style={{ color: '#888' }}>Você não tem permissão para visualizar este relatório.</p>
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
      {/* Header Bar */}
      <div
        className="flex items-center justify-between px-5 py-3 flex-shrink-0"
        style={{ background: '#141414', borderBottom: '2px solid #E30613' }}
      >
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-colors"
            style={{ color: '#888' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#E30613'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#888'; }}
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>
          <div style={{ width: 1, height: 20, background: '#333' }} />
          <div>
            <h1 className="text-sm font-black uppercase tracking-widest text-white">{report.title}</h1>
            {report.unit_name && (
              <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider" style={{ color: '#E30613' }}>
                <Building2 className="w-3 h-3" />
                {report.unit_name}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => setFullscreen(!fullscreen)}
          className="flex items-center gap-2 px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all"
          style={{ background: fullscreen ? '#333' : '#E30613', color: '#fff' }}
          onMouseEnter={e => { if (!fullscreen) e.currentTarget.style.background = '#b80010'; }}
          onMouseLeave={e => { if (!fullscreen) e.currentTarget.style.background = '#E30613'; }}
        >
          {fullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          {fullscreen ? 'Sair' : 'Tela Cheia'}
        </button>
      </div>

      {/* Embed */}
      <div className="flex-1 overflow-hidden">
        {iframeSrc ? (
          <iframe
            title={report.title}
            src={iframeSrc}
            className="w-full h-full border-0"
            style={{ minHeight: fullscreen ? 'calc(100vh - 56px)' : 'calc(100vh - 120px)' }}
            allowFullScreen
          />
        ) : report.embed_code ? (
          <div
            className="w-full h-full"
            style={{ minHeight: 'calc(100vh - 120px)' }}
            dangerouslySetInnerHTML={{ __html: report.embed_code }}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-white opacity-40 text-sm uppercase tracking-widest">
            Nenhum código embed configurado.
          </div>
        )}
      </div>
    </div>
  );
}
