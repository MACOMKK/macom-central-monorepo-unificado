import React from "react";

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen grid grid-cols-1 bg-background lg:grid-cols-[minmax(360px,0.95fr)_minmax(420px,1.05fr)]">
      <section className="hidden min-h-screen flex-col justify-between bg-[#111111] px-12 py-10 lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-primary">
            <span className="text-base font-black text-white">M</span>
          </div>
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-white">MACOM</p>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-primary">REVVO CRM</p>
          </div>
        </div>
        <div className="max-w-xl">
          <p className="mb-4 text-xs font-black uppercase tracking-[0.28em] text-primary">REVVO CRM</p>
          <h2 className="text-5xl font-black leading-tight text-white">
            Relacionamento comercial com mais ritmo.
          </h2>
          <p className="mt-5 max-w-lg text-sm font-medium leading-7 text-white/60">
            Central de leads, contatos e atividades para operacao automotiva.
          </p>
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/35">
          Gestao comercial automotiva
        </p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-10 text-center">
            <div className="mb-6 flex items-center justify-center gap-3 lg:hidden">
              <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-primary">
                <span className="text-base font-black text-white">M</span>
              </div>
              <div className="text-left">
                <p className="text-sm font-black uppercase tracking-[0.22em] text-foreground">MACOM</p>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-primary">REVVO CRM</p>
              </div>
            </div>
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-md bg-primary">
              <Icon className="h-7 w-7 text-primary-foreground" aria-hidden="true" />
            </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="text-muted-foreground mt-2">{subtitle}</p>}
        </div>
        <div className="border border-border bg-card p-8 shadow-sm">
          {children}
        </div>
        {footer && (
          <p className="text-center text-sm text-muted-foreground mt-6">{footer}</p>
        )}
      </div>
      </section>
    </div>
  );
}
