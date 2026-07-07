export default function PageHeader({ eyebrow = 'Console Macom', title, description, actions }) {
  return (
    <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase text-primary">{eyebrow}</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
        ) : null}
      </div>

      {actions ? <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">{actions}</div> : null}
    </header>
  );
}
