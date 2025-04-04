import React, { useEffect, useState } from 'react';
import { PaperHighlight, PaperHighlightAnnotation } from '@/app/paper/[id]/page';
import { ScrollText, Quote, CornerDownRight, MessageSquarePlus, Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter, CardHeader } from './ui/card';

export interface AnnotationButtonProps {
	highlightId: string;
	addAnnotation: (highlightId: string, content: string) => Promise<PaperHighlightAnnotation>;
}

export function AnnotationButton({ highlightId, addAnnotation }: AnnotationButtonProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [content, setContent] = useState("");

	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					className="flex items-center gap-2"
				>
					<MessageSquarePlus size={16} />
					{'Add annotation'}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-80">
				<div className="space-y-4">
					<div className="space-y-2">
						<label htmlFor="annotation">Annotation</label>
						<Textarea
							id="annotation"
							value={content}
							onChange={(e) => setContent(e.target.value)}
							placeholder="Add your notes here..."
							className="min-h-[100px]"
						/>
					</div>
					<div className="flex justify-end gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => {
								setIsOpen(false);
								setContent("");
							}}
						>
							Cancel
						</Button>
						<Button
							size="sm"
							onClick={async () => {
								if (content.trim()) {
									await addAnnotation(highlightId, content);
									setContent("");
									setIsOpen(false);
								}
							}}
						>
							Save
						</Button>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}

interface AnnotationCardProps {
	annotation: PaperHighlightAnnotation;
	removeAnnotation: (annotationId: string) => void;
	updateAnnotation: (annotationId: string, content: string) => void;
}

function AnnotationCard({ annotation, removeAnnotation, updateAnnotation }: AnnotationCardProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [editedContent, setEditedContent] = useState(annotation.content);

	const handleSave = async (e: React.MouseEvent) => {
		e.stopPropagation();
		if (editedContent.trim() !== annotation.content) {
			await updateAnnotation(annotation.id, editedContent);
		}
		setIsEditing(false);
	};

	if (isEditing) {
		return (
			<Card className='group border-0 shadow-none rounded-lg py-2'>
				<CardContent className="space-y-2 text-sm">
					<Textarea
						value={editedContent}
						onChange={(e) => setEditedContent(e.target.value)}
						className="min-h-[100px] text-sm"
						onClick={(e) => e.stopPropagation()}
						autoFocus
					/>
					<div className="flex justify-end gap-2">
						<Button
							variant="ghost"
							size="sm"
							onClick={(e) => {
								e.stopPropagation();
								setIsEditing(false);
								setEditedContent(annotation.content);
							}}
						>
							Cancel
						</Button>
						<Button
							size="sm"
							onClick={handleSave}
						>
							Save
						</Button>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className='group border-0 shadow-none rounded-lg py-2 hover:bg-secondary/50 transition-colors cursor-pointer'>
			<CardContent className='text-sm'>
				{annotation.content}
			</CardContent>
			<CardFooter className="flex justify-between items-center">
				<p className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
					{new Date(annotation.created_at).toLocaleDateString()}
				</p>
				<div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
					<Button
						variant="ghost"
						className="h-6 w-6 p-0"
						onClick={(e) => {
							e.stopPropagation();
							removeAnnotation(annotation.id);
						}}
					>
						<Trash2 size={14} className="text-muted-foreground hover:text-destructive transition-colors" />
					</Button>
					<Button
						variant="ghost"
						className="h-6 w-6 p-0"
						onClick={(e) => {
							e.stopPropagation();
							setIsEditing(true);
						}}
					>
						<Pencil size={14} className="text-muted-foreground hover:text-primary transition-colors" />
					</Button>
				</div>
			</CardFooter>
		</Card>
	);
}

interface AnnotationsViewProps {
	highlights: PaperHighlight[];
	annotations: PaperHighlightAnnotation[];
	addAnnotation: (highlightId: string, content: string) => Promise<PaperHighlightAnnotation>;
	onHighlightClick: (highlight: PaperHighlight) => void;
	activeHighlight?: PaperHighlight | null;
	removeAnnotation: (annotationId: string) => void;
	updateAnnotation: (annotationId: string, content: string) => void;
}

export function AnnotationsView({ highlights, annotations, onHighlightClick, addAnnotation, activeHighlight, removeAnnotation, updateAnnotation }: AnnotationsViewProps) {
	const [sortedHighlights, setSortedHighlights] = React.useState<PaperHighlight[]>([]);
	const [highlightAnnotationMap, setHighlightAnnotationMap] = React.useState<Map<string, PaperHighlightAnnotation[] | null>>(new Map());

	useEffect(() => {
		const sorted = [...highlights].sort((a, b) => {
			if (a.start_offset === b.start_offset) {
				return a.end_offset - b.end_offset;
			}
			return a.start_offset - b.start_offset;
		});
		setSortedHighlights(sorted);

		const annotationMap = new Map<string, PaperHighlightAnnotation[]>();

		annotations.forEach((annotation) => {
			const highlightId = annotation.highlight_id;
			const existingAnnotations = annotationMap.get(highlightId) || [];
			existingAnnotations.push(annotation);
			annotationMap.set(highlightId, existingAnnotations);
		});

		setHighlightAnnotationMap(annotationMap);
	}, [highlights, annotations]);

	return (
		<div className="flex flex-col gap-4 p-4">
			{highlights.length === 0 ? (
				<p className="text-secondary-foreground text-sm">
					No annotations yet. Highlight some text to get started.
				</p>
			) : (
				<div className="space-y-4">
					{sortedHighlights.map((highlight) => (
						<Card
							key={highlight.id}
							className="border rounded-lg p-4 hover:bg-secondary/50 transition-colors cursor-pointer px-0"
							onClick={() => onHighlightClick(highlight)}
						>
							<CardContent>

								<p className="text-sm font-normal mb-2">
									&ldquo;{highlight.raw_text}&rdquo;
								</p>
								{
									highlight.id &&
									highlightAnnotationMap.has(highlight.id) && (
										<>
											{
												highlightAnnotationMap.get(highlight.id)?.map((annotation) => (
													<AnnotationCard
														key={annotation.id}
														annotation={annotation}
														removeAnnotation={removeAnnotation}
														updateAnnotation={updateAnnotation}
													/>
												))
											}
											{
												highlightAnnotationMap.get(highlight.id)?.length === 0 && <p className="text-sm text-muted-foreground">No annotation yet.</p>
											}
										</>
									)
								}
								{
									highlight.id && activeHighlight?.id === highlight.id && (
										<div className="flex justify-between items-center">
											<AnnotationButton
												highlightId={highlight.id}
												addAnnotation={addAnnotation}
											/>
										</div>
									)
								}
							</CardContent>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}
