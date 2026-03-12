export type Cliente={id:string;user_id?:string;nombre:string;fecha_entrada:string;concepto:string|null;importe_total:number;estado:string|null;notas:string|null};
export type Cobro={id:string;user_id?:string;cliente_id:string;fecha_cobro:string;importe:number;metodo_pago:string|null;notas:string|null};
export type Reparto={id:string;user_id?:string;fecha:string;mes:string;categoria:string|null;destinatario:string|null;concepto:string|null;importe:number;notas:string|null};
