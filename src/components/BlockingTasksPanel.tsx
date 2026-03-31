import React from 'react';
import { CheckCircle2, Circle, AlertTriangle, Zap } from 'lucide-react';
import { Task } from '../types';
import { cn } from '../lib/utils';

interface BlockingTasksPanelProps {
  tasks: Task[];
  onComplete: (taskId: string) => void;
  title?: string;
}

export const BlockingTasksPanel: React.FC<BlockingTasksPanelProps> = ({
  tasks,
  onComplete,
  title = 'Tareas requeridas',
}) => {
  if (tasks.length === 0) return null;

  const blocking = tasks.filter(t => t.bloqueante);
  const nonBlocking = tasks.filter(t => !t.bloqueante);
  const allBlockingDone = blocking.every(t => t.status === 'Completada');
  const completedCount = tasks.filter(t => t.status === 'Completada').length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {!allBlockingDone && <AlertTriangle size={14} className="text-amber-600" />}
          <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            {title}
          </h4>
        </div>
        <span className={cn(
          'px-2 py-0.5 rounded-md text-[10px] font-black',
          allBlockingDone
            ? 'bg-emerald-500/10 text-emerald-600'
            : 'bg-amber-500/10 text-amber-600',
        )}>
          {completedCount}/{tasks.length}
        </span>
      </div>

      {!allBlockingDone && (
        <div className="px-3 py-2 bg-amber-500/5 border border-amber-500/15 rounded-xl">
          <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400">
            Completá las tareas bloqueantes para poder avanzar al siguiente estado.
          </p>
        </div>
      )}

      <div className="space-y-1.5">
        {blocking.map(task => (
          <TaskRow key={task.id} task={task} onComplete={onComplete} isBlocking />
        ))}
        {nonBlocking.map(task => (
          <TaskRow key={task.id} task={task} onComplete={onComplete} isBlocking={false} />
        ))}
      </div>

      {tasks.some(t => t.generadaAutomaticamente) && (
        <div className="flex items-center gap-1.5 text-[9px] font-bold text-muted-foreground">
          <Zap size={10} />
          Tareas generadas automáticamente por el sistema
        </div>
      )}
    </div>
  );
};

const TaskRow: React.FC<{
  task: Task;
  onComplete: (id: string) => void;
  isBlocking: boolean;
}> = ({ task, onComplete, isBlocking }) => {
  const done = task.status === 'Completada';

  return (
    <button
      onClick={() => !done && onComplete(task.id)}
      disabled={done}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left',
        done
          ? 'bg-muted/30 border-border/50 opacity-60'
          : isBlocking
            ? 'border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10'
            : 'border-border hover:bg-muted/50',
      )}
    >
      {done ? (
        <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
      ) : (
        <Circle size={16} className={cn('shrink-0', isBlocking ? 'text-amber-500' : 'text-muted-foreground')} />
      )}
      <div className="flex-1 min-w-0">
        <span className={cn(
          'text-xs font-bold',
          done && 'line-through text-muted-foreground',
        )}>
          {task.title}
        </span>
        {isBlocking && !done && (
          <span className="ml-2 text-[9px] font-black text-amber-600 uppercase tracking-wider">
            Bloqueante
          </span>
        )}
      </div>
      {task.completedBy && done && (
        <span className="text-[9px] font-bold text-muted-foreground shrink-0">
          {task.completedBy}
        </span>
      )}
    </button>
  );
};
