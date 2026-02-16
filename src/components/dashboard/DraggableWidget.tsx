import React, { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { GripVertical, ArrowUp, ArrowDown } from 'lucide-react';

interface DraggableWidgetProps {
    id: string;
    index: number;
    moveWidget: (dragIndex: number, hoverIndex: number) => void;
    isCustomizeMode: boolean;
    children: React.ReactNode;
    className?: string;
    totalCount?: number;
}

export const DraggableWidget: React.FC<DraggableWidgetProps> = ({
    id,
    index,
    moveWidget,
    isCustomizeMode,
    children,
    className,
    totalCount = 0
}) => {
    const ref = useRef<HTMLDivElement>(null);

    const [{ handlerId }, drop] = useDrop<{ index: number; id: string }, void, { handlerId: string | symbol | null }>({
        accept: 'widget',
        collect(monitor) {
            return {
                handlerId: monitor.getHandlerId(),
            };
        },
        hover(item, monitor) {
            if (!ref.current) {
                return;
            }
            const dragIndex = item.index;
            const hoverIndex = index;

            // Don't replace items with themselves
            if (dragIndex === hoverIndex) {
                return;
            }

            // Determine rectangle on screen
            const hoverBoundingRect = ref.current?.getBoundingClientRect();

            // Get vertical middle
            const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;

            // Determine mouse position
            const clientOffset = monitor.getClientOffset();

            // Get pixels to the top
            const hoverClientY = (clientOffset as any).y - hoverBoundingRect.top;

            // Only perform the move when the mouse has crossed half of the items height
            // When dragging downwards, only move when the cursor is below 50%
            // When dragging upwards, only move when the cursor is above 50%

            // Dragging downwards
            if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
                return;
            }

            // Dragging upwards
            if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
                return;
            }

            // Time to actually perform the action
            moveWidget(dragIndex, hoverIndex);

            // Note: we're mutating the monitor item here!
            // Generally it's better to avoid mutations,
            // but it's good here for the sake of performance
            // to avoid expensive index searches.
            item.index = hoverIndex;
        },
    });

    const [{ isDragging }, drag] = useDrag({
        type: 'widget',
        item: () => {
            return { id, index };
        },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
        canDrag: isCustomizeMode,
    });

    const opacity = isDragging ? 0.4 : 1;
    drag(drop(ref));

    const handleMoveUp = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (index > 0) {
            moveWidget(index, index - 1);
        }
    };

    const handleMoveDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (index < totalCount - 1) {
            moveWidget(index, index + 1);
        }
    };

    return (
        <div
            ref={ref}
            style={{ opacity }}
            data-handler-id={handlerId}
            className={`relative ${isCustomizeMode ? 'cursor-move ring-2 ring-primary/20 rounded-xl' : ''} ${className || ''}`}
        >
            {isCustomizeMode && (
                <div className="absolute -top-4 -left-4 z-50 flex items-center gap-1 bg-background text-primary rounded-full p-1 shadow-xl border-2 border-primary/20">
                    <div className="p-1.5 hover:bg-muted rounded-full cursor-grab active:cursor-grabbing">
                        <GripVertical className="w-5 h-5" />
                    </div>

                    <div className="w-[1px] h-6 bg-border mx-1" />

                    <button
                        onClick={handleMoveUp}
                        disabled={index === 0}
                        className={`p-1.5 rounded-full transition-colors ${index === 0 ? 'text-muted-foreground cursor-not-allowed opacity-50' : 'hover:bg-primary hover:text-primary-foreground text-primary'}`}
                        title="Move Up"
                    >
                        <ArrowUp className="w-5 h-5" />
                    </button>

                    <button
                        onClick={handleMoveDown}
                        disabled={index === totalCount - 1}
                        className={`p-1.5 rounded-full transition-colors ${index === totalCount - 1 ? 'text-muted-foreground cursor-not-allowed opacity-50' : 'hover:bg-primary hover:text-primary-foreground text-primary'}`}
                        title="Move Down"
                    >
                        <ArrowDown className="w-5 h-5" />
                    </button>
                </div>
            )}
            {children}
        </div>
    );
};
