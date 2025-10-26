/**
 * Blockscout REST API v2 Client
 * Documentation: https://eth-sepolia.blockscout.com/api-docs
 */

const SEPOLIA_BASE_URL = 'https://eth-sepolia.blockscout.com/api/v2';

export interface BlockscoutTransaction {
  hash: string;
  block_number: number;
  timestamp: string;
  from: { hash: string };
  to: { hash: string } | null;
  value: string;
  fee: { value: string };
  gas_limit: string;
  gas_used: string;
  gas_price: string;
  method: string | null;
  status: 'ok' | 'error';
  result: string;
  confirmations: number;
}

export interface BlockscoutTokenTransfer {
  tx_hash: string;
  from: { hash: string };
  to: { hash: string };
  token: {
    address: string;
    name: string;
    symbol: string;
    type: string;
  };
  total: {
    value: string;
    decimals: string;
    token_id?: string; // For ERC-721
  };
  timestamp: string;
}

export interface BlockscoutTokenHolder {
  address: { hash: string; name?: string };
  value: string;
  token_id?: string;
}

export interface BlockscoutAddressCounters {
  transactions_count: string;
  token_transfers_count: string;
  gas_usage_count: string;
  validations_count?: string;
}

export interface BlockscoutTokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: string;
  total_supply: string;
  exchange_rate?: string;
  type: string;
  holders?: string;
  circulating_market_cap?: string;
}

export interface BlockscoutLog {
  transaction_hash: string;
  block_number: number;
  block_timestamp: string;
  address: { hash: string };
  topics: string[];
  data: string;
  index: number;
  decoded?: {
    method_call: string;
    method_id: string;
    parameters: Array<{
      name: string;
      type: string;
      value: any;
    }>;
  };
}

export interface BlockscoutPaginatedResponse<T> {
  items: T[];
  next_page_params?: {
    block_number?: number;
    index?: number;
    items_count?: number;
    [key: string]: any;
  };
}

class BlockscoutAPI {
  private baseUrl: string;
  private cache: Map<string, { data: any; timestamp: number }>;
  private cacheTTL: number = 30000; // 30 seconds

  constructor(baseUrl: string = SEPOLIA_BASE_URL) {
    this.baseUrl = baseUrl;
    this.cache = new Map();
  }

  private getCacheKey(endpoint: string, params: any): string {
    return `${endpoint}:${JSON.stringify(params)}`;
  }

  private getCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > this.cacheTTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  async request<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    const cacheKey = this.getCacheKey(endpoint, params);
    const cached = this.getCache<T>(cacheKey);
    if (cached) return cached;

    const queryString = new URLSearchParams(
      Object.entries(params).filter(([_, v]) => v != null)
    ).toString();
    const url = `${this.baseUrl}${endpoint}${queryString ? '?' + queryString : ''}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Blockscout API error: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      this.setCache(cacheKey, data);
      return data as T;
    } catch (error) {
      console.error('Blockscout API error:', error);
      throw error;
    }
  }

  // Address Endpoints

  async getAddress(address: string) {
    return this.request<{
      hash: string;
      coin_balance: string;
      creator_address_hash: string | null;
      implementation_address: string | null;
      is_contract: boolean;
      is_verified: boolean;
    }>(`/addresses/${address}`);
  }

  async getAddressCounters(address: string) {
    return this.request<BlockscoutAddressCounters>(`/addresses/${address}/counters`);
  }

  async getAddressTransactions(
    address: string,
    params: { to?: string; from?: string; limit?: number } = {}
  ) {
    // Note: Blockscout v2 doesn't support 'limit' parameter
    // We'll fetch all and slice client-side if limit is provided
    const { limit, ...apiParams } = params;
    const response = await this.request<BlockscoutPaginatedResponse<BlockscoutTransaction>>(
      `/addresses/${address}/transactions`,
      apiParams
    );

    // Apply limit client-side if specified
    if (limit && response.items) {
      response.items = response.items.slice(0, limit);
    }

    return response;
  }

  async getAddressTokenTransfers(
    address: string,
    params: { type?: string; filter?: string; token?: string } = {}
  ) {
    return this.request<BlockscoutPaginatedResponse<BlockscoutTokenTransfer>>(
      `/addresses/${address}/token-transfers`,
      params
    );
  }

  async getAddressTokenBalances(address: string) {
    return this.request<Array<{
      token: BlockscoutTokenInfo;
      value: string;
      token_id?: string;
    }>>(`/addresses/${address}/token-balances`);
  }

  async getAddressNFTs(address: string, params: { type?: string } = {}) {
    return this.request<BlockscoutPaginatedResponse<{
      token: BlockscoutTokenInfo;
      token_id: string;
      value: string;
      id: string;
    }>>(`/addresses/${address}/nfts`, params);
  }

  async getAddressNFTsByCollection(address: string, collectionAddress: string) {
    return this.request<BlockscoutPaginatedResponse<{
      token: BlockscoutTokenInfo;
      token_id: string;
      value: string;
      id: string;
    }>>(`/addresses/${address}/nfts`, { token: collectionAddress });
  }

  async getAddressLogs(address: string, params: any = {}) {
    return this.request<BlockscoutPaginatedResponse<BlockscoutLog>>(
      `/addresses/${address}/logs`,
      params
    );
  }

  async getCoinBalanceHistory(address: string) {
    return this.request<BlockscoutPaginatedResponse<{
      block_number: number;
      block_timestamp: string;
      delta: string;
      value: string;
      transaction_hash: string | null;
    }>>(`/addresses/${address}/coin-balance-history`);
  }

  async getCoinBalanceHistoryByDay(address: string) {
    return this.request<{
      items: Array<{
        date: string;
        value: string;
      }>;
    }>(`/addresses/${address}/coin-balance-history-by-day`);
  }

  // Transaction Endpoints

  async getTransaction(txHash: string) {
    return this.request<BlockscoutTransaction>(`/transactions/${txHash}`);
  }

  async getTransactionSummary(txHash: string) {
    return this.request<{
      summary_template: string;
      summary_template_variables: Record<string, any>;
    }>(`/transactions/${txHash}/summary`);
  }

  async getTransactionLogs(txHash: string) {
    return this.request<BlockscoutPaginatedResponse<BlockscoutLog>>(
      `/transactions/${txHash}/logs`
    );
  }

  async getTransactionTokenTransfers(txHash: string, params: { type?: string } = {}) {
    return this.request<BlockscoutPaginatedResponse<BlockscoutTokenTransfer>>(
      `/transactions/${txHash}/token-transfers`,
      params
    );
  }

  // Token Endpoints

  async getToken(tokenAddress: string) {
    return this.request<BlockscoutTokenInfo>(`/tokens/${tokenAddress}`);
  }

  async getTokenTransfers(tokenAddress: string, params: any = {}) {
    return this.request<BlockscoutPaginatedResponse<BlockscoutTokenTransfer>>(
      `/tokens/${tokenAddress}/transfers`,
      params
    );
  }

  async getTokenHolders(tokenAddress: string, params: any = {}) {
    return this.request<BlockscoutPaginatedResponse<BlockscoutTokenHolder>>(
      `/tokens/${tokenAddress}/holders`,
      params
    );
  }

  async getTokenCounters(tokenAddress: string) {
    return this.request<{
      token_holders_count: string;
      token_transfers_count: string;
    }>(`/tokens/${tokenAddress}/counters`);
  }

  // Smart Contract Endpoints

  async getSmartContract(address: string) {
    return this.request<{
      abi: any[];
      source_code: string;
      compiler_version: string;
      optimization_enabled: boolean;
      optimization_runs: number | null;
      constructor_args: string | null;
      is_self_destructed: boolean;
      is_verified: boolean;
      name: string;
    }>(`/smart-contracts/${address}`);
  }

  // Stats Endpoints

  async getStats() {
    return this.request<{
      total_blocks: string;
      total_addresses: string;
      total_transactions: string;
      average_block_time: number;
      coin_price: string | null;
      total_gas_used: string;
      transactions_today: string;
      gas_used_today: string;
    }>('/stats');
  }

  async getTransactionCharts(params: any = {}) {
    return this.request<{
      chart_data: Array<{
        date: string;
        tx_count: number;
      }>;
    }>('/stats/charts/transactions', params);
  }

  // Search Endpoint

  async search(query: string) {
    return this.request<{
      items: Array<{
        type: 'address' | 'transaction' | 'block' | 'token' | 'label';
        [key: string]: any;
      }>;
    }>('/search', { q: query });
  }

  // Helper Methods

  /**
   * Fetch all pages of a paginated endpoint
   * @param endpoint API endpoint
   * @param initialParams Initial query parameters
   * @param maxPages Maximum number of pages to fetch (default: 10)
   */
  async getAllPages<T>(
    endpoint: string,
    initialParams: any = {},
    maxPages: number = 10
  ): Promise<T[]> {
    const results: T[] = [];
    let params = initialParams;
    let page = 0;

    while (page < maxPages) {
      const data = await this.request<BlockscoutPaginatedResponse<T>>(endpoint, params);

      if (!data.items || data.items.length === 0) {
        break;
      }

      results.push(...data.items);

      if (!data.next_page_params) {
        break;
      }

      params = { ...initialParams, ...data.next_page_params };
      page++;
    }

    return results;
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const blockscoutAPI = new BlockscoutAPI();
