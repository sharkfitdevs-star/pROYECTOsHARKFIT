import { BaseEntity } from './_base';
class VentasEntity extends BaseEntity {
  constructor() { super('/ventas'); }
}
export const Ventas = new VentasEntity();
