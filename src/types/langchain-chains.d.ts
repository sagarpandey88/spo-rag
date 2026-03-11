declare module 'langchain/chains' {
  export class RetrievalQAChain {
    static fromLLM(llm: any, retriever: any, opts?: any): RetrievalQAChain;
    call(args: any): Promise<any>;
  }
}
