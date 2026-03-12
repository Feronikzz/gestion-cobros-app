export function eur(value:number|string|null|undefined){return new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:2}).format(Number(value||0));}
export function monthFromDate(dateStr:string){return String(dateStr||'').slice(0,7);}
export function monthLabel(month:string){const [y,m]=month.split('-');const names=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];return `${names[Number(m)-1]||month} ${y||''}`.trim();}
