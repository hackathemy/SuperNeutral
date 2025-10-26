import dotenv from "dotenv";
dotenv.config();

// ethers는 HederaLangchainToolkit 내부에서 사용될 수 있으므로 명시적으로 import할 필요가 없을 수 있습니다.
// 만약 delegateeWallet 생성에 필요하다면 import를 유지해야 합니다.
import { ethers } from "ethers";
import { createAgent } from "langchain";
import { Client, PrivateKey } from "@hashgraph/sdk";
import { HederaLangchainToolkit } from "hedera-agent-kit";
import createVincentSignerPlugin from "../vincent-signer-plugin/index.js";
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGroq } from "@langchain/groq";
import { ChatOllama } from "@langchain/ollama";

// Choose your AI provider (install the one you want to use)
function createLLM() {
  // Option 1: OpenAI (requires OPENAI_API_KEY in.env)
  if (process.env.OPENAI_API_KEY) {
    return new ChatOpenAI({ model: "gpt-4o-mini" });
  }

  // Option 2: Anthropic Claude (requires ANTHROPIC_API_KEY in.env)
  if (process.env.ANTHROPIC_API_KEY) {
    return new ChatAnthropic({ model: "claude-3-haiku-20240307" });
  }

  // Option 3: Groq (requires GROQ_API_KEY in.env)
  if (process.env.GROQ_API_KEY) {
    return new ChatGroq({ model: "llama3-8b-8192" });
  }

  // Option 4: Ollama (free, local - requires Ollama installed and running)
  // Ollama 생성자 호출을 try-catch 블록으로 감싸서 Ollama가 실행 중이지 않을 때의 오류를 처리합니다.
  try {
    const ollama = new ChatOllama({
      model: "llama3.2",
      baseUrl: "http://localhost:11434",
    });
    // 간단한 테스트 호출로 Ollama 서버 연결을 확인합니다.
    ollama.invoke("test").catch(() => {
      throw new Error("Ollama server not running.");
    });
    return ollama;
  } catch (e) {
    console.error(
      "No AI provider configured or Ollama is not running. Please either:"
    );
    console.error(
      "1. Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or GROQ_API_KEY in.env"
    );
    console.error("2. Install and run Ollama locally (https://ollama.com)");
    process.exit(1);
  }
}

async function main() {
  // Initialize AI model
  const llm = createLLM();

  // Hedera client setup (Testnet by default)
  const client = Client.forTestnet().setOperator(
    process.env.HEDERA_ACCOUNT_ID,
    PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY)
  );

  const delegateeWallet = new ethers.Wallet(process.env.DELEGATEE_PRIVATE_KEY);
  const vincentParams = {
    delegateSigner: delegateeWallet,
    delegatorPkpEthAddress: "",
    hederaNetwork: "testnet",
  };

  const vincentPlugin = createVincentSignerPlugin(vincentParams);

  const hederaAgentToolkit = new HederaLangchainToolkit({
    client,
    configuration: {
      plugins: [vincentPlugin],
    },
  });

  // Fetch tools from toolkit
  const tools = hederaAgentToolkit.getTools();

  // 1. createAgent를 사용하여 에이전트를 직접 생성합니다.
  // 복잡한 ChatPromptTemplate 대신 간단한 systemPrompt를 사용합니다.
  const agent = createAgent({
    llm,
    tools,
    systemPrompt: "You are a helpful Hedera assistant.",
  });

  // 2. 사용자 질문을 정의합니다.
  const userQuery = "Check the balance of account 0.0.12345";

  // 3. 새로운 호출 방식에 맞춰 에이전트를 실행합니다.
  // 상태 객체에 'messages' 배열을 전달합니다.
  const response = await agent.invoke({
    messages: [{ role: "user", content: userQuery }],
  });

  // 4. 응답에서 최종 답변을 추출합니다.
  // 최종 답변은 메시지 배열의 마지막에 위치합니다.
  const finalAnswer = response.messages[response.messages.length - 1].content;
  console.log("Final Answer:", finalAnswer);
}

main().catch(console.error);
