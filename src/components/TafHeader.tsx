
export function TafHeader() {
  return (
    <header className="w-full flex flex-col items-center justify-center p-6 bg-header-bg border-b border-border mb-8 shadow-2xl">
      <div className="flex items-center gap-4 mb-2">
        <img 
          src="https://lh3.googleusercontent.com/d/17kc2nUXkquKM3y3uN0242Nl_r2BMWZfV" 
          alt="Logo COTER"
          className="h-[60px] w-auto object-contain drop-shadow-2xl"
          referrerPolicy="no-referrer"
        />
        <div className="text-center">
          <h1 className="text-sm md:text-base font-bold tracking-widest text-foreground/80 uppercase">
            Exército Brasileiro
          </h1>
          <h2 className="text-xs md:text-sm font-semibold text-foreground/80 uppercase">
            Comando de Operações Terrestres
          </h2>
          <h2 className="text-[10px] md:text-xs font-bold text-foreground/60 uppercase tracking-[0.3em] mt-0.5">
            (COTER)
          </h2>
        </div>
      </div>
      <div className="flex flex-col items-center w-fit">
        <div className="h-px w-full bg-accent/50 mb-2" />
        <h3 className="text-lg md:text-xl font-black text-foreground tracking-tighter uppercase italic">
          Teste de Aptidão Física (TAF)
        </h3>
      </div>
      <p className="text-[10px] text-muted-foreground mt-4 uppercase tracking-widest">
        Criado pelo ST Ernani P. Júnior
      </p>
    </header>
  );
}
