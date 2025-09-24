import {
  type Action,
  type Content,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  type State,
  logger,
} from '@elizaos/core';
import { AutoKnowledgeService } from '../services/autoKnowledgeService';

export const autoKnowledgeAction: Action = {
  name: 'AUTO_KNOWLEDGE_STATS',
  similes: [
    'KNOWLEDGE_STATS',
    'AUTO_STATS',
    'SHOW_KNOWLEDGE',
    'KNOWLEDGE_BASE',
    'HOW_MANY_MOLECULES',
    'GET_ENERGIES',
    'SHOW_ENERGIES',
    'SCF_ENERGIES',
    'ENERGY_VALUES'
  ],
  description: 'Show statistics and detailed data from the automatic knowledge graph including actual energy values',

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
    _state: State | undefined
  ): Promise<boolean> => {
    const text = message.content.text?.toLowerCase() || '';
    
    const keywords = [
      'knowledge', 'stats', 'statistics', 'how many', 'molecules',
      'auto', 'automatic', 'processed', 'files', 'knowledge base',
      'energies', 'energy', 'scf', 'get energies', 'show energies'
    ];
    
    return keywords.some(keyword => text.includes(keyword));
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State | undefined,
    _options: any,
    callback?: HandlerCallback,
    _responses?: Memory[]
  ) => {
    try {
      logger.info('Handling AUTO_KNOWLEDGE_STATS action');

      const autoService = runtime.getService<AutoKnowledgeService>('auto-knowledge');
      
      if (!autoService) {
        const errorContent: Content = {
          text: '❌ Auto knowledge service is not running. The service automatically monitors data/examples/ for Gaussian files.',
          actions: ['AUTO_KNOWLEDGE_STATS'],
          source: message.content.source,
        };
        
      if (callback) await callback(errorContent);
      return;
      }

      const userQuery = message.content.text?.toLowerCase() || '';
      const isEnergyQuery = userQuery.includes('energy') || userQuery.includes('energies') || userQuery.includes('scf');
      
      let responseText: string;
      
      if (isEnergyQuery) {
        // User wants specific energy values
        const energyData = await autoService.getEnergies();
        
        if (energyData.error) {
          const errorContent: Content = {
            text: `❌ Error getting energy data: ${energyData.error}`,
            actions: ['AUTO_KNOWLEDGE_STATS'],
            source: message.content.source,
          };
          
      if (callback) await callback(errorContent);
      return;
        }

        responseText = `⚡ **SCF Energies from Knowledge Graph**\n\n`;
        
        if (energyData.totalEnergies === 0) {
          responseText += `❌ No energy data found in the knowledge graph.\n\n`;
          responseText += `💡 **To get energy data:** Copy Gaussian .log files to \`data/examples/\` and they'll be automatically processed!`;
        } else {
          responseText += `**📊 Total Files:** ${energyData.totalFiles} | **Total Energies:** ${energyData.totalEnergies}\n\n`;
          
          for (const [filename, energies] of Object.entries(energyData.energiesByFile)) {
            responseText += `**📄 ${filename}:**\n`;
            
            if (Array.isArray(energies) && energies.length > 0) {
              energies.forEach((energy: any, index: number) => {
                responseText += `  ${index + 1}. **${energy.hartree.toFixed(8)} hartree** (${energy.eV.toFixed(6)} eV)\n`;
              });
            } else {
              responseText += `  ⚠️  No energies found\n`;
            }
            responseText += '\n';
          }
          
          responseText += `💡 **Units:** Hartree is the atomic unit of energy. 1 hartree = 27.211 eV`;
        }
      } else {
        // User wants general statistics
        const stats = await autoService.getStats();
        
        if (stats.error) {
          const errorContent: Content = {
            text: `❌ Error getting knowledge stats: ${stats.error}`,
            actions: ['AUTO_KNOWLEDGE_STATS'],
            source: message.content.source,
          };
          
      if (callback) await callback(errorContent);
      return;
        }

        responseText = `🧠 **Automatic Knowledge Graph Status**

**📁 Monitoring:** \`${stats.watchedDirectory}\`
**📊 Knowledge Graph:** \`${stats.knowledgeGraphPath}\`

**📈 Current Statistics:**
• **Files Processed:** ${stats.totalFiles}
• **Molecules:** ${stats.molecules}
• **SCF Energies:** ${stats.scfEnergies}  
• **Atoms:** ${stats.atoms}
• **Last Update:** ${new Date(stats.lastUpdate).toLocaleString()}

${stats.totalFiles > 0 ? 
  `**📄 Processed Files:**\n${stats.filesList.map((file: string) => `• ${file}`).join('\n')}` : 
  '**📄 No files processed yet**'
}

💡 **How it works:** Just copy \`.log\` or \`.out\` files to \`data/examples/\` and they'll be automatically processed into the knowledge graph!

${stats.totalFiles === 0 ? 
  '\n🚀 **Get started:** Copy some Gaussian log files to `data/examples/` to see the knowledge graph grow automatically!' : 
  '\n🔍 **Energy tip:** Ask me to "get energies" or "show SCF energies" to see actual energy values!'
}`;
      }

      const responseContent: Content = {
        text: responseText,
        actions: ['AUTO_KNOWLEDGE_STATS'],
        source: message.content.source,
      };

      if (callback) await callback(responseContent);
      return;

    } catch (error) {
      logger.error('Error in AUTO_KNOWLEDGE_STATS action:', error);
      
      const errorContent: Content = {
        text: `❌ Failed to get knowledge stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
        actions: ['AUTO_KNOWLEDGE_STATS'],
        source: message.content.source,
      };
      
      if (callback) await callback(errorContent);
      return;
    }
  },

  examples: [
    [
      {
        name: '{{user1}}',
        content: {
          text: 'Show me knowledge graph statistics',
        },
      },
      {
        name: '{{user2}}',
        content: {
          text: '🧠 **Automatic Knowledge Graph Status**\n\n**📁 Monitoring:** `data/examples/`\n**📊 Knowledge Graph:** `data/auto-knowledge-graph.ttl`\n\n**📈 Current Statistics:**\n• **Files Processed:** 2\n• **Molecules:** 2\n• **SCF Energies:** 2\n• **Atoms:** 30\n• **Last Update:** 1/15/2024, 10:30:00 AM\n\n**📄 Processed Files:**\n• lactone.log\n• TolueneEnergy.log\n\n💡 **How it works:** Just copy `.log` or `.out` files to `data/examples/` and they\'ll be automatically processed into the knowledge graph!',
          actions: ['AUTO_KNOWLEDGE_STATS'],
        },
      },
    ],
    [
      {
        name: '{{user1}}',
        content: {
          text: 'Get energies',
        },
      },
      {
        name: '{{user2}}',
        content: {
          text: '⚡ **SCF Energies from Knowledge Graph**\n\n**📊 Total Files:** 2 | **Total Energies:** 2\n\n**📄 TolueneEnergy.log:**\n  1. **-271.63604200 hartree** (-7384.636042 eV)\n\n**📄 lactone.log:**\n  1. **-227.85626900 hartree** (-6202.856269 eV)\n\n💡 **Units:** Hartree is the atomic unit of energy. 1 hartree = 27.211 eV',
          actions: ['AUTO_KNOWLEDGE_STATS'],
        },
      },
    ],
    [
      {
        name: '{{user1}}',
        content: {
          text: 'How many molecules do we have?',
        },
      },
      {
        name: '{{user2}}',
        content: {
          text: '🧠 **Automatic Knowledge Graph Status**\n\n**📈 Current Statistics:**\n• **Files Processed:** 3\n• **Molecules:** 3\n• **SCF Energies:** 3\n• **Atoms:** 45\n\n**📄 Processed Files:**\n• lactone.log\n• TolueneEnergy.log\n• example.log\n\n🔍 **Energy tip:** Ask me to "get energies" or "show SCF energies" to see actual energy values!',
          actions: ['AUTO_KNOWLEDGE_STATS'],
        },
      },
    ],
  ],
}; 