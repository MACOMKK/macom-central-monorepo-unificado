export default function ModuloEmBreve({ titulo, descricao }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-24 text-center">
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Em breve</span>
      <h2 className="text-xl font-bold">{titulo}</h2>
      {descricao && <p className="max-w-md text-sm text-muted-foreground">{descricao}</p>}
    </div>
  );
}
