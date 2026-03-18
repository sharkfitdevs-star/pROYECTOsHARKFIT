import { BaseEntity } from './_base';
class AgendamientosEntity extends BaseEntity {
  constructor() { super('/agendamientos'); }
}
export const Agendamientos = new AgendamientosEntity();
