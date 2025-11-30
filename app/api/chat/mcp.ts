import axios from 'axios';

/**
 * Figma MCP Client - Integrates with official Figma MCP server
 * https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/
 */
export class FigmaMCPClient {
    private config: {
        serverUrl: string;
        timeout: number;
        retries: number;
    };
    private isAvailable: boolean;
    private requestId: number;
    private headers: Record<string, string>;
    constructor(config = {}) {
        this.config = {
            serverUrl: 'https://mcp.figma.com/mcp',
            timeout: 60000, // 60 seconds
            retries: 3,
            ...config,
        };
        this.isAvailable = false;
        this.requestId = 0; // 请求 ID 计数器，从 1 开始自增
        this.headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.FIGMA_MCP_TOKEN}`,
            'mcp-protocol-version': '2025-06-18',
            'User-Agent': 'Cursor/1.7.54 (darwin arm64)',
            'content-type': 'application/json',
            'accept': 'application/json, text/event-stream',
            'accept-language': '*',
            'sec-fetch-mode': 'cors',
            'accept-encoding': 'br, gzip',
        }
    }

    /**
     * Test connection to Figma MCP server
     */
    async checkAvailability() {
        try {
            await this.initialize();
            this.isAvailable = true;
            return true;
        } catch (error) {
            console.warn(`⚠️ Figma MCP server not available: ${error instanceof Error ? error.message : 'Unknown error'}`);
            this.isAvailable = false;
            return false;
        }
    }



    /**
     * 通用的 MCP 请求方法
     * @private
     */
    async _makeRequest(method: string, params: any = undefined, operationName: string) {
        if (!this.isAvailable && method !== 'initialize') {
            await this.checkAvailability();
            if (!this.isAvailable) {
                throw new Error('Figma MCP server is not available');
            }
        }

        if (params) {
            // 请求 ID 自增，从 1 开始
            this.requestId++;
        }

        // 按照 MCP 协议格式构建请求
        const request = {
            method: method,
            params: params ? {
                ...params,
                _meta: {
                    progressToken: this.requestId
                }
            } : undefined,
            jsonrpc: "2.0",
            id: params ? this.requestId : undefined
        };

        try {
            console.log(`🔍 Calling Figma MCP: ${operationName}`);

            const response = await axios.post(this.config.serverUrl, request, {
                timeout: this.config.timeout,
                headers: this.headers,
            });

            if (response.status !== 200 && response.status !== 202) {
                throw new Error(`Figma MCP server responded with error: ${response.status} ${response.statusText}`);
            }

            if (typeof response.data === 'string') {
                const lines = response.data.split('\n');
                let index = 0;
                for (const line of lines) {
                    index++;
                    if (line.startsWith('data:')) {
                        const rest = line.split(':').slice(1).join(':') + lines.slice(index + 1).join('\n');
                        return JSON.parse(rest.trim());
                    }
                }
            }
            return response.data;
        } catch (error) {
            const errorMessage = this.formatError(error);
            console.error(`❌ Figma MCP ${operationName} failed: ${errorMessage}`);
            return {
                content: [{
                    type: 'text',
                    text: `Figma MCP server error: ${errorMessage}`,
                }],
                isError: true,
                error: errorMessage,
            };
        }
    }

    /**
     * 调用 Figma MCP 工具
     */
    async callTool(toolName: string, params: any) {
        return this._makeRequest('tools/call', {
            name: toolName,
            arguments: params
        }, `tool:${toolName}`).then(data => {
            data.result.content = (data.result.content || []).filter((item: any) => !/^file:/.test(item.uri));
            return data;
        });
    }

    /**
     * 获取可用工具列表
     */
    async listTools(): Promise<{
        result: {
            tools: {
                name: string;
                description: string;
                inputSchema: any;
                outputSchema: any;
            }[];
        }
    }> {
        return this._makeRequest('tools/list', {}, 'listTools');
    }

    /**
     * 获取可用资源列表
     */
    async listResources() {
        return this._makeRequest('resources/list', {}, 'listResources');
    }

    /**
     * 获取可用提示列表
     */
    async listPrompts() {
        return this._makeRequest('prompts/list', {}, 'listPrompt');
    }

    /**
     * 初始化 MCP 客户端
     */
    async initialize() {
        return this._makeRequest('initialize', undefined, 'initialize');
    }

    /**
     * 通知 MCP 客户端已初始化
     */
    async notifyInitialized() {
        return this._makeRequest('notifications/initialized', undefined, 'notifyInitialized');
    }

    /**
     * 生成Figma节点的截图
     * @param {Object} params - 截图参数
     * @param {string} params.nodeId - 节点ID (格式: "123:456" 或 "123-456")
     * @param {string} params.fileKey - Figma文件的key
     * @param {string} [params.clientLanguages] - 客户端使用的编程语言 (逗号分隔)
     * @param {string} [params.clientFrameworks] - 客户端使用的框架 (逗号分隔)
     * @returns {Promise<Object>} 截图数据响应
     * @example
     * const screenshot = await client.getScreenshot({
     *   nodeId: '123:456',
     *   fileKey: 'abc123',
     *   clientLanguages: 'javascript,typescript',
     *   clientFrameworks: 'react'
     * });
     */
    async getScreenshot(params: { nodeId: string; fileKey: string; clientLanguages?: string; clientFrameworks?: string }) {
        const { nodeId, fileKey, clientLanguages, clientFrameworks } = params;

        if (!nodeId || !fileKey) {
            throw new Error('nodeId and fileKey are required parameters');
        }

        return this.callTool('get_screenshot', {
            nodeId,
            fileKey,
            ...(clientLanguages && { clientLanguages }),
            ...(clientFrameworks && { clientFrameworks }),
        });
    }

    /**
     * 生成设计系统规则提示
     * @param {Object} params - 设计系统规则参数
     * @param {string} [params.nodeId] - 节点ID (格式: "123:456" 或 "123-456")
     * @param {string} [params.clientLanguages] - 客户端使用的编程语言 (逗号分隔)
     * @param {string} [params.clientFrameworks] - 客户端使用的框架 (逗号分隔)
     * @returns {Promise<Object>} 设计系统规则响应
     * @example
     * const rules = await client.createDesignSystemRules({
     *   nodeId: '123:456',
     *   clientLanguages: 'typescript',
     *   clientFrameworks: 'react,tailwind'
     * });
     */
    async createDesignSystemRules(params: { nodeId?: string; clientLanguages?: string; clientFrameworks?: string }) {
        const { nodeId, clientLanguages, clientFrameworks } = params;

        return this.callTool('create_design_system_rules', {
            ...(nodeId && { nodeId }),
            ...(clientLanguages && { clientLanguages }),
            ...(clientFrameworks && { clientFrameworks }),
        });
    }

    /**
     * 获取Figma节点的设计上下文并生成UI代码
     * @param {Object} params - 设计上下文参数
     * @param {string} params.nodeId - 节点ID (格式: "123:456" 或 "123-456")
     * @param {string} params.fileKey - Figma文件的key
     * @param {string} [params.clientLanguages] - 客户端使用的编程语言 (逗号分隔)
     * @param {string} [params.clientFrameworks] - 客户端使用的框架 (逗号分隔)
     * @param {boolean} [params.forceCode] - 是否强制返回代码(而不是元数据)
     * @param {boolean} [params.disableCodeConnect] - 是否禁用Code Connect
     * @returns {Promise<Object>} 包含代码字符串和资源下载URL的响应
     * @example
     * const context = await client.getDesignContext({
     *   nodeId: '123:456',
     *   fileKey: 'abc123',
     *   clientFrameworks: 'react',
     *   forceCode: true
     * });
     */
    async getDesignContext(params: { nodeId: string; fileKey: string; clientLanguages?: string; clientFrameworks?: string; forceCode?: boolean; disableCodeConnect?: boolean }) {
        const { nodeId, fileKey, clientLanguages, clientFrameworks, forceCode, disableCodeConnect } = params;

        if (!nodeId || !fileKey) {
            throw new Error('nodeId and fileKey are required parameters');
        }

        return this.callTool('get_design_context', {
            nodeId,
            fileKey,
            ...(clientLanguages && { clientLanguages }),
            ...(clientFrameworks && { clientFrameworks }),
            ...(forceCode !== undefined && { forceCode }),
            ...(disableCodeConnect !== undefined && { disableCodeConnect }),
        });
    }

    /**
     * 获取Figma节点或页面的元数据(XML格式)
     * @param {Object} params - 元数据参数
     * @param {string} params.nodeId - 节点ID (格式: "123:456" 或 "123-456", 也可以是页面ID如 "0:1")
     * @param {string} params.fileKey - Figma文件的key
     * @param {string} [params.clientLanguages] - 客户端使用的编程语言 (逗号分隔)
     * @param {string} [params.clientFrameworks] - 客户端使用的框架 (逗号分隔)
     * @returns {Promise<Object>} 包含节点ID、图层类型、名称、位置和大小的元数据响应
     * @example
     * const metadata = await client.getMetadata({
     *   nodeId: '0:1',
     *   fileKey: 'abc123'
     * });
     */
    async getMetadata(params: { nodeId: string; fileKey: string; clientLanguages?: string; clientFrameworks?: string }) {
        const { nodeId, fileKey, clientLanguages, clientFrameworks } = params;

        if (!nodeId || !fileKey) {
            throw new Error('nodeId and fileKey are required parameters');
        }

        return this.callTool('get_metadata', {
            nodeId,
            fileKey,
            ...(clientLanguages && { clientLanguages }),
            ...(clientFrameworks && { clientFrameworks }),
        });
    }

    /**
     * 获取Figma节点的变量定义
     * @param {Object} params - 变量定义参数
     * @param {string} params.nodeId - 节点ID (格式: "123:456" 或 "123-456")
     * @param {string} params.fileKey - Figma文件的key
     * @param {string} [params.clientLanguages] - 客户端使用的编程语言 (逗号分隔)
     * @param {string} [params.clientFrameworks] - 客户端使用的框架 (逗号分隔)
     * @returns {Promise<Object>} 变量定义映射 (如: {'icon/default/secondary': '#949494'})
     * @example
     * const variables = await client.getVariableDefs({
     *   nodeId: '123:456',
     *   fileKey: 'abc123'
     * });
     */
    async getVariableDefs(params: { nodeId: string; fileKey: string; clientLanguages?: string; clientFrameworks?: string }) {
        const { nodeId, fileKey, clientLanguages, clientFrameworks } = params;

        if (!nodeId || !fileKey) {
            throw new Error('nodeId and fileKey are required parameters');
        }

        return this.callTool('get_variable_defs', {
            nodeId,
            fileKey,
            ...(clientLanguages && { clientLanguages }),
            ...(clientFrameworks && { clientFrameworks }),
        });
    }

    /**
     * 为FigJam节点生成UI代码
     * @param {Object} params - FigJam参数
     * @param {string} params.nodeId - 节点ID (格式: "123:456" 或 "123-456")
     * @param {string} params.fileKey - Figma文件的key
     * @param {string} [params.clientLanguages] - 客户端使用的编程语言 (逗号分隔)
     * @param {string} [params.clientFrameworks] - 客户端使用的框架 (逗号分隔)
     * @param {boolean} [params.includeImagesOfNodes=true] - 是否在响应中包含节点图片
     * @returns {Promise<Object>} FigJam节点的代码生成响应
     * @example
     * const figjam = await client.getFigjam({
     *   nodeId: '123:456',
     *   fileKey: 'abc123',
     *   includeImagesOfNodes: true
     * });
     */
    async getFigjam(params: { nodeId: string; fileKey: string; clientLanguages?: string; clientFrameworks?: string; includeImagesOfNodes?: boolean }) {
        const { nodeId, fileKey, clientLanguages, clientFrameworks, includeImagesOfNodes } = params;

        if (!nodeId || !fileKey) {
            throw new Error('nodeId and fileKey are required parameters');
        }

        return this.callTool('get_figjam', {
            nodeId,
            fileKey,
            ...(clientLanguages && { clientLanguages }),
            ...(clientFrameworks && { clientFrameworks }),
            ...(includeImagesOfNodes !== undefined && { includeImagesOfNodes }),
        });
    }

    /**
     * 获取Code Connect映射
     * @param {Object} params - Code Connect映射参数
     * @param {string} params.nodeId - 节点ID (格式: "123:456" 或 "123-456")
     * @param {string} params.fileKey - Figma文件的key
     * @param {string} [params.codeConnectLabel] - Code Connect标签(用于多语言/框架映射)
     * @returns {Promise<Object>} 节点ID到代码库组件位置的映射
     * @example
     * const mapping = await client.getCodeConnectMap({
     *   nodeId: '123:456',
     *   fileKey: 'abc123',
     *   codeConnectLabel: 'react'
     * });
     * // 返回示例: {'1:2': {codeConnectSrc: 'https://github.com/foo/components/Button.tsx', codeConnectName: 'Button'}}
     */
    async getCodeConnectMap(params: { nodeId: string; fileKey: string; codeConnectLabel?: string }) {
        const { nodeId, fileKey, codeConnectLabel } = params;

        if (!nodeId || !fileKey) {
            throw new Error('nodeId and fileKey are required parameters');
        }

        return this.callTool('get_code_connect_map', {
            nodeId,
            fileKey,
            ...(codeConnectLabel && { codeConnectLabel }),
        });
    }

    /**
     * 获取当前认证用户信息
     * @returns {Promise<Object>} 包含认证用户信息的响应
     * @example
     * const userInfo = await client.whoami();
     * console.log('Current user:', userInfo);
     */
    async whoami() {
        return this.callTool('whoami', {});
    }

    /**
     * Format error messages for user-friendly display
     */
    formatError(error: any) {
        if (axios.isAxiosError(error)) {
            if (error.code === 'ECONNREFUSED') {
                return 'Cannot connect to Figma MCP server. Please ensure Figma desktop app is running with MCP enabled.';
            }

            if (error.code === 'ETIMEDOUT') {
                return 'Request to Figma MCP server timed out. Please try again.';
            }

            if (error.response) {
                return `Figma MCP server responded with error: ${error.response.status} ${error.response.statusText}`;
            }

            return error.message;
        }

        if (error instanceof Error) {
            return error.message;
        }

        return 'Unknown error occurred while communicating with Figma MCP server';
    }

    /**
     * Get current server configuration
     */
    getConfig() {
        return { ...this.config };
    }

    /**
     * Check if server is available
     */
    isServerAvailable() {
        return this.isAvailable;
    }
}
export const figmaMCPClient = new FigmaMCPClient();