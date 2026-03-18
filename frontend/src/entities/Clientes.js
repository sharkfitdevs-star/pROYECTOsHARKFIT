import { BaseEntity } from './_base';
class ClientesEntity extends BaseEntity {
  constructor() { super('/clientes'); }
}
export const Clientes = new ClientesEntity();
