export type Visibility = 'public' | 'private';

export interface iDocumentsState {
  documents: ReadonlyArray<iDocument>;
}
export interface iDocument {
  _id?: string;
  title: string;
  content: Array<{
    text: string;
    options: Array<{ key: string; value: string | number }>;
  }>;
  keywords: Array<string>;
  author: {
    _id: string;
    name: string;
  };
  fork?: string;
  visibility: Visibility;
}

export interface iDocumentDTO {
  title: string;
  content: Array<{
    text: string;
    options: Array<{ key: string; value: string | number }>;
  }>;
  keywords: Array<string>;
  author: string;
  visibility: Visibility;
}

export class Document implements iDocument {
  constructor(
    public title: string,
    public content: Array<{
      text: string;
      options: Array<{ key: string; value: string | number }>;
    }>,
    public keywords: Array<string>,
    public author: {
      _id: string;
      name: string;
    },
    public visibility: Visibility
  ) {}
}
