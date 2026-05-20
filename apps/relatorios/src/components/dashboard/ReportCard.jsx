import React from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Building2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const categoryLabels = {
  gerencial: 'Gerencial',
  financeiro: 'Financeiro',
  operacional: 'Operacional',
  comercial: 'Comercial',
  rh: 'RH',
  outros: 'Outros',
};

const providerLabels = {
  power_bi: 'Power BI',
  data_studio: 'Data Studio',
  other: 'Outro',
};

export default function ReportCard({ report, showProviderTag = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <Link
        to={`/relatorio/${report.id}`}
        state={{ reportPreview: report }}
        className="group block bg-white relative overflow-hidden transition-all duration-200"
        style={{
          borderLeft: '4px solid #E30613',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(227,6,19,0.12)';
          e.currentTarget.style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        {/* Top bar */}
        <div className="h-0.5 w-0 group-hover:w-full transition-all duration-300" style={{ background: '#E30613' }} />

        <div className="p-5">
          <div className="mb-3 flex flex-wrap gap-2">
            {report.category && (
              <span
                className="inline-block text-[9px] font-black uppercase tracking-widest px-2 py-0.5"
                style={{ background: '#E30613', color: '#fff' }}
              >
                {categoryLabels[report.category] || report.category}
              </span>
            )}
            {showProviderTag && report.provider && report.provider !== 'other' ? (
              <span
                className="inline-block text-[9px] font-black uppercase tracking-widest px-2 py-0.5"
                style={{ background: '#141414', color: '#fff' }}
              >
                {providerLabels[report.provider] || providerLabels.other}
              </span>
            ) : null}
          </div>

          {/* Icon + Title */}
          <div className="flex items-start gap-3 mb-3">
            <div
              className="flex-shrink-0 w-9 h-9 flex items-center justify-center"
              style={{ background: '#f2f2f2' }}
            >
              <BarChart3 className="w-4 h-4" style={{ color: '#E30613' }} />
            </div>
            <h3 className="font-black text-sm uppercase tracking-wide leading-snug text-foreground group-hover:text-red-600 transition-colors" style={{ color: '#141414' }}>
              {report.title}
            </h3>
          </div>

          {report.description && (
            <p className="text-xs line-clamp-2 mb-4" style={{ color: '#888' }}>
              {report.description}
            </p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid #f0f0f0' }}>
            {report.unit_label ? (
              <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#999' }}>
                <Building2 className="w-3 h-3" />
                {report.unit_label}
              </span>
            ) : <span />}
            <span
              className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: '#E30613' }}
            >
              Ver <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
