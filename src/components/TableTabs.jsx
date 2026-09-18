import React from 'react';
import { Send, FolderKanban, Link as LinkIcon, Smartphone } from 'lucide-react';

export default function TableTabs({ 
  activeTable, 
  setActiveTable, 
  campaignCount, 
  messagesCount, 
  linksCount,
  activeCampaign 
}) {
  const tabs = [
    { 
      id: 'campanhas', 
      label: 'Todas as Campanhas', 
      icon: FolderKanban, 
      count: campaignCount 
    },
    { 
      id: 'disparos', 
      label: activeCampaign ? `Disparos: ${activeCampaign.name}` : 'Fluxo de Disparos', 
      icon: Send, 
      count: messagesCount 
    },
    { 
      id: 'links', 
      label: 'Links Predefinidos', 
      icon: LinkIcon, 
      count: linksCount 
    },
    { 
      id: 'simulator', 
      label: 'Simulador Multicanal', 
      icon: Smartphone, 
      count: null 
    }
  ];

  return (
    <div className="table-tabs-bar">
      {tabs.map((tab) => {
        const IconComponent = tab.icon;
        const isActive = activeTable === tab.id;
        return (
          <div
            key={tab.id}
            className={`table-tab ${isActive ? 'active' : ''}`}
            onClick={() => setActiveTable(tab.id)}
            id={`tab-${tab.id}`}
          >
            <IconComponent size={14} />
            <span style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {tab.label}
            </span>
            {tab.count !== null && <span className="tab-counter">{tab.count}</span>}
          </div>
        );
      })}
    </div>
  );
}
