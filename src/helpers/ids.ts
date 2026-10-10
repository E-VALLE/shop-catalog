/** Ids de produtos criados localmente no admin começam aqui, acima dos ids da DummyJSON (máx. ~200). */
export const LOCAL_ID_START = 10_000;

export const isLocalProductId = (id: number): boolean => id >= LOCAL_ID_START;
