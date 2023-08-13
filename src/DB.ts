type ObjStoreDetails = {
  version: number;
  parameters?: IDBObjectStoreParameters;
  indices?: ObjStoreIndex[];
};
type ObjStoreIndex = {
  version: number;
  name: string;
  keyPath: string | string[];
  options?: IDBIndexParameters;
};
