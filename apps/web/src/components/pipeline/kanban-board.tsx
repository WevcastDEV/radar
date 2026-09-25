'use client';

import { PipelineStageData, LeadListItem } from '@radar/types';
import { KanbanColumn } from './kanban-column';
import { useState } from 'react';

interface KanbanBoardProps {
  stages: PipelineStageData[];
  onDragEnd: (leadId: string, stageId: string) => void;
  onMoveStage?: (leadId: string, stageId: string) => void;
  onSelectLead?: (lead: LeadListItem) => void;
  onAddLeadToStage?: (stageId: string) => void;
}

export function KanbanBoard({ 
  stages, 
  onDragEnd, 
  onMoveStage,
  onSelectLead,
  onAddLeadToStage,
}: KanbanBoardProps) {
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.setData('text/plain', leadId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    if (draggedLeadId) {
      onDragEnd(draggedLeadId, stageId);
      setDraggedLeadId(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  return (
    <div className="flex gap-4 h-full overflow-x-auto pb-4 scrollbar-hide">
      {stages.map((stage, index) => {
        const prevStage = index > 0 ? stages[index - 1] : undefined;
        const nextStage = index < stages.length - 1 ? stages[index + 1] : undefined;

        return (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            prevStage={prevStage}
            nextStage={nextStage}
            onDragStart={handleDragStart}
            onDrop={(e) => handleDrop(e, stage.id)}
            onDragOver={handleDragOver}
            onMoveStage={onMoveStage || onDragEnd}
            onSelectLead={onSelectLead}
            onAddLeadToStage={onAddLeadToStage}
            isDragging={!!draggedLeadId}
          />
        );
      })}
    </div>
  );
}
