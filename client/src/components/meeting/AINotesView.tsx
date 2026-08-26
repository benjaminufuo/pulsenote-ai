import React, { useState } from 'react';
import { Sparkles, CheckSquare, HelpCircle, Tag, Lightbulb, CheckCircle2 } from 'lucide-react';
import { api } from '../../api/client';
import './AINotesView.css';

export interface ActionItemData {
  id: string;
  task: string;
  assigneeName?: string;
  dueDate?: string;
  completed: boolean;
}

export interface SummaryData {
  overview: string;
  keyPoints: string[];
  decisions: string[];
  questions: string[];
  topics: string[];
}

interface AINotesViewProps {
  summary: SummaryData | null;
  actionItems: ActionItemData[];
  onTasksUpdated: () => void;
}

export const AINotesView: React.FC<AINotesViewProps> = ({ summary, actionItems, onTasksUpdated }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'points' | 'decisions' | 'tasks' | 'questions'>('overview');

  const toggleTask = async (taskId: string, currentCompleted: boolean) => {
    try {
      await api.patch(`/action-items/${taskId}`, { completed: !currentCompleted });
      onTasksUpdated();
    } catch (err) {
      console.error('Failed to toggle task:', err);
    }
  };

  if (!summary) {
    return (
      <div className="card recorder-card">
        <Sparkles size={32} color="var(--color-primary)" />
        <p className="recorder-subtitle">AI notes will appear once recording processing completes.</p>
      </div>
    );
  }

  return (
    <div className="card notes-card">
      <div className="notes-tabs-bar">
        {[
          { key: 'overview', label: 'Overview', icon: Sparkles },
          { key: 'points', label: 'Key Points', icon: Lightbulb },
          { key: 'decisions', label: 'Decisions', icon: CheckCircle2 },
          { key: 'tasks', label: `Action Items (${actionItems.length})`, icon: CheckSquare },
          { key: 'questions', label: 'Questions', icon: HelpCircle }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`notes-tab-button ${isActive ? 'notes-tab-button-active' : ''}`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="notes-tab-body">
        {activeTab === 'overview' && (
          <div>
            <h4>Executive Summary</h4>
            <p className="segment-text-content">{summary.overview}</p>

            <h5 className="dropdown-header">Topic Tags</h5>
            <div className="topic-chips-group">
              {summary.topics.map((topic, i) => (
                <span key={i} className="topic-chip-badge">
                  <Tag size={12} /> {topic}
                </span>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'points' && (
          <div>
            <h4>Key Discussion Highlights</h4>
            <ul>
              {summary.keyPoints.map((pt, i) => (
                <li key={i} className="segment-text-content">{pt}</li>
              ))}
            </ul>
          </div>
        )}

        {activeTab === 'decisions' && (
          <div>
            <h4>Agreed Decisions</h4>
            {summary.decisions.length === 0 ? (
              <p className="recorder-subtitle">No formal decisions recorded in this meeting.</p>
            ) : (
              <div className="meetings-list-stack">
                {summary.decisions.map((dec, i) => (
                  <div key={i} className="decision-box">{dec}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'tasks' && (
          <div>
            <h4>Extracted Action Items</h4>
            {actionItems.length === 0 ? (
              <p className="recorder-subtitle">No pending action items extracted.</p>
            ) : (
              <div className="meetings-list-stack">
                {actionItems.map((item) => (
                  <div key={item.id} className="action-item-row">
                    <div className="speaker-label-row">
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => toggleTask(item.id, item.completed)}
                        className="action-item-checkbox"
                      />
                      <span className={item.completed ? 'action-item-text-completed' : ''}>
                        {item.task}
                      </span>
                    </div>

                    <div className="speaker-label-row">
                      <span className="platform-chip">👤 {item.assigneeName || 'Unassigned'}</span>
                      {item.dueDate && (
                        <span className="meeting-card-date">
                          📅 {new Date(item.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'questions' && (
          <div>
            <h4>Unresolved Questions</h4>
            {summary.questions.length === 0 ? (
              <p className="recorder-subtitle">No unresolved questions recorded.</p>
            ) : (
              <div className="meetings-list-stack">
                {summary.questions.map((q, i) => (
                  <div key={i} className="question-box">❓ {q}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
