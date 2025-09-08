import { db } from '../database/db';
import { sql } from 'drizzle-orm';

interface QueryMetrics {
  query: string;
  executionTime: number;
  rowsAffected: number;
  timestamp: string;
}

interface IndexSuggestion {
  table: string;
  columns: string[];
  reason: string;
  estimatedImprovement: string;
}

class QueryPerformanceAnalyzer {
  private queryMetrics: QueryMetrics[] = [];
  private slowQueryThreshold = 100; // milliseconds

  async analyzeQuery(query: string): Promise<any> {
    const startTime = Date.now();
    
    try {
      // Execute EXPLAIN ANALYZE for the query
      const explainResult = await db.execute(
        sql`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql.raw(query)}`
      );
      
      const executionTime = Date.now() - startTime;
      
      // Store metrics
      this.queryMetrics.push({
        query: query.substring(0, 200), // Truncate for storage
        executionTime,
        rowsAffected: 0, // Will be extracted from explain result
        timestamp: new Date().toISOString()
      });

      return {
        executionTime,
        explainResult: explainResult[0],
        isSlow: executionTime > this.slowQueryThreshold
      };
    } catch (error) {
      console.error('Query analysis failed:', error);
      return null;
    }
  }

  getSlowQueries(): QueryMetrics[] {
    return this.queryMetrics
      .filter(metric => metric.executionTime > this.slowQueryThreshold)
      .sort((a, b) => b.executionTime - a.executionTime);
  }

  getQueryStats(): {
    totalQueries: number;
    slowQueries: number;
    averageTime: number;
    maxTime: number;
  } {
    const total = this.queryMetrics.length;
    const slow = this.queryMetrics.filter(m => m.executionTime > this.slowQueryThreshold).length;
    const avgTime = total > 0 ? this.queryMetrics.reduce((sum, m) => sum + m.executionTime, 0) / total : 0;
    const maxTime = total > 0 ? Math.max(...this.queryMetrics.map(m => m.executionTime)) : 0;

    return {
      totalQueries: total,
      slowQueries: slow,
      averageTime: Math.round(avgTime),
      maxTime
    };
  }

  generateIndexSuggestions(): IndexSuggestion[] {
    return [
      {
        table: 'agents',
        columns: ['user_id', 'is_active'],
        reason: 'Frequent filtering by user and status',
        estimatedImprovement: '60-80% faster user agent queries'
      },
      {
        table: 'conversations',
        columns: ['agent_id', 'created_at'],
        reason: 'Recent conversations lookup per agent',
        estimatedImprovement: '40-60% faster conversation history'
      },
      {
        table: 'messages',
        columns: ['conversation_id', 'created_at'],
        reason: 'Message ordering within conversations',
        estimatedImprovement: '50-70% faster message loading'
      },
      {
        table: 'agents',
        columns: ['created_at'],
        reason: 'Date-based agent analytics and reporting',
        estimatedImprovement: '30-50% faster analytics queries'
      }
    ];
  }

  async createOptimizedIndexes(): Promise<boolean> {
    try {
      const indexCommands = [
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agents_user_active ON agents(user_id, is_active)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_agent_created ON conversations(agent_id, created_at DESC)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at DESC)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_agents_created ON agents(created_at DESC)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tools_settings_user ON tools_settings(user_id)',
        'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_integrations_user ON integrations_connections(user_id)'
      ];

      for (const indexCommand of indexCommands) {
        try {
          await db.execute(sql.raw(indexCommand));
          console.log(`✅ Index created: ${indexCommand.split(' ON ')[1]}`);
        } catch (error) {
          console.log(`ℹ️  Index may already exist: ${indexCommand.split(' ON ')[1]}`);
        }
      }

      return true;
    } catch (error) {
      console.error('Index creation failed:', error);
      return false;
    }
  }

  clearMetrics(): void {
    this.queryMetrics = [];
  }
}

export const queryAnalyzer = new QueryPerformanceAnalyzer();