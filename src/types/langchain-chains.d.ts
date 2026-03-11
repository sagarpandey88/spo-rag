declare module '@langchain/classic/chains' {
  export class RetrievalQAChain {
    static fromLLM(llm: any, retriever: any, opts?: any): RetrievalQAChain;
    call(args: any): Promise<any>;
  }
}
