"use client";

import { useEffect, useRef, useState } from "react";
import "../lib/promisePolyfill";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import "../app/globals.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ArrowLeft, ArrowRight, X, Minus, Plus } from "lucide-react";

interface PdfViewerProps {
	pdfUrl: string;
}

export function PdfViewer({ pdfUrl }: PdfViewerProps) {
	const [numPages, setNumPages] = useState<number | null>(null);
	const [selectedText, setSelectedText] = useState<string>("");
	const [workerInitialized, setWorkerInitialized] = useState(false);

	const [scale, setScale] = useState(1.2); // Higher scale for better resolution
	const [width, setWidth] = useState<number>(0);

	// Search functionality
	const [searchText, setSearchText] = useState("");
	const [searchResults, setSearchResults] = useState<Array<{
		pageIndex: number;
		matchIndex: number;
	}>>([]);
	const [currentMatch, setCurrentMatch] = useState(-1);
	const pagesRef = useRef<(HTMLDivElement | null)[]>([]);
	const containerRef = useRef<HTMLDivElement>(null);

	// Set up the worker in useEffect to ensure it only runs in the browser
	useEffect(() => {
		if (!workerInitialized) {
			// Use the .mjs worker file we found
			pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.mjs`;
			setWorkerInitialized(true);
		}
	}, [workerInitialized]);

	// Calculate container width for responsive sizing
	useEffect(() => {
		const updateWidth = () => {
			// Get container width and use it for PDF rendering
			const container = document.getElementById('pdf-container');
			if (container) {
				// Subtract some padding to avoid horizontal scrollbar
				setWidth(container.clientWidth - 32);
			}
		};

		updateWidth();
		window.addEventListener('resize', updateWidth);
		return () => window.removeEventListener('resize', updateWidth);
	}, []);

	const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
		setNumPages(numPages);
		// Initialize page refs array
		pagesRef.current = new Array(numPages).fill(null);
	};

	const handleTextSelection = () => {
		const selection = window.getSelection();
		if (selection && selection.toString()) {
			setSelectedText(selection.toString());
			console.log("Selected text:", selection.toString());
			// You can add your callback logic here
			// For example, show a popup or trigger some action
		}
	};

	const zoomIn = () => setScale(prev => Math.min(prev + 0.2, 2.5));
	const zoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.7));


	// Search functionality
	const performSearch = () => {
		if (!searchText.trim()) {
			setSearchResults([]);
			setCurrentMatch(-1);
			return;
		}

		const results: Array<{ pageIndex: number; matchIndex: number }> = [];

		// Find all text layer divs in the document
		const textLayers = document.querySelectorAll('.react-pdf__Page__textContent');

		textLayers.forEach((layer, pageIndex) => {
			const pageText = layer.textContent || '';
			let startIndex = 0;
			let matchIndex = 0;

			// Find all occurrences in this page
			while (startIndex < pageText.length) {
				const index = pageText.toLowerCase().indexOf(searchText.toLowerCase(), startIndex);
				if (index === -1) break;

				results.push({ pageIndex, matchIndex });
				matchIndex++;
				startIndex = index + 1;
			}
		});

		setSearchResults(results);
		setCurrentMatch(results.length > 0 ? 0 : -1);

		// Scroll to first match if found
		if (results.length > 0) {
			scrollToMatch(results[0]);
		}
	};

	const scrollToMatch = (match: { pageIndex: number; matchIndex: number }) => {
		if (!match) return;

		const pageDiv = pagesRef.current[match.pageIndex];
		if (!pageDiv) return;

		// Scroll to the page
		pageDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });

		// Remove styling from any existing highlights
		const existingHighlights = document.querySelectorAll('.react-pdf__Page__textContent span.border-2');
		existingHighlights.forEach(span => {
			span.classList.remove('border-2', 'border-yellow-500');
		});

		// Highlight the text by selecting the text layer
		setTimeout(() => {
			const textLayer = pageDiv.querySelector('.react-pdf__Page__textContent');
			if (!textLayer) return;

			// This is a basic approach - for better highlighting, you'd need a more
			// sophisticated approach to find the exact text nodes
			const textNodes = Array.from(textLayer.querySelectorAll('span'))
				.filter(span => span.textContent?.toLowerCase().includes(searchText.toLowerCase()));

			if (textNodes.length > match.matchIndex) {
				textNodes[match.matchIndex].classList.add('border-2', 'border-yellow-500');
				// Scroll to the highlighted text
				textNodes[match.matchIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
			}
		}, 100);
	};

	const goToNextMatch = () => {
		if (searchResults.length === 0) return;

		const nextMatch = (currentMatch + 1) % searchResults.length;
		setCurrentMatch(nextMatch);
		scrollToMatch(searchResults[nextMatch]);
	};

	const goToPreviousMatch = () => {
		if (searchResults.length === 0) return;

		const prevMatch = (currentMatch - 1 + searchResults.length) % searchResults.length;
		setCurrentMatch(prevMatch);
		scrollToMatch(searchResults[prevMatch]);
	};


	return (
		<div ref={containerRef} className="flex flex-col items-center gap-4 h-screen w-full overflow-y-auto" id="pdf-container">
			<div className="sticky top-0 z-10 flex items-center justify-between bg-white/80 backdrop-blur-sm p-2 rounded-none w-full border-b border-gray-300">
				<div className="flex items-center gap-2 flex-grow max-w-md">
					<Input
						type="text"
						placeholder="Search..."
						value={searchText}
						onChange={(e) => setSearchText(e.target.value)}
						onKeyDown={(e) => e.key === 'Enter' && performSearch()}
						className="h-8 text-sm"
					/>
					<Button onClick={performSearch} size="sm" variant="ghost" className="h-8 px-2">
						<Search size={16} />
					</Button>
				</div>

				{searchResults.length > 0 && (
					<div className="flex items-center gap-1 mx-2">
						<span className="text-xs text-gray-600">{currentMatch + 1}/{searchResults.length}</span>
						<Button onClick={goToPreviousMatch} size="sm" variant="ghost" className="h-8 w-8 p-0">
							<ArrowLeft size={16} />
						</Button>
						<Button onClick={goToNextMatch} size="sm" variant="ghost" className="h-8 w-8 p-0">
							<ArrowRight size={16} />
						</Button>
						<Button onClick={() => setSearchResults([])} size="sm" variant="ghost" className="h-8 w-8 p-0">
							<X size={16} />
						</Button>
					</div>
				)}

				<div className="flex items-center gap-1">
					<Button onClick={zoomOut} size="sm" variant="ghost" className="h-8 w-8 p-0">
						<Minus size={16} />
					</Button>
					<span className="text-xs w-12 text-center">{Math.round(scale * 100)}%</span>
					<Button onClick={zoomIn} size="sm" variant="ghost" className="h-8 w-8 p-0">
						<Plus size={16} />
					</Button>
				</div>
			</div>

			<Document
				file={pdfUrl}
				onLoadSuccess={onDocumentLoadSuccess}
				onMouseUp={handleTextSelection}
				onLoadError={(error) => console.error("Error loading PDF:", error)}
				onContextMenu={handleTextSelection}
			>
				{Array.from(new Array(numPages || 0), (_, index) => (
					<div
						ref={(el) => {
							pagesRef.current[index] = el;
						}}
						key={`page_container_${index + 1}`}
					>
						<Page
							key={`page_${index + 1}`}
							pageNumber={index + 1}
							className="mb-8 shadow-lg"
							renderTextLayer={true}
							renderAnnotationLayer={true}
							scale={scale}
							width={width > 0 ? width : undefined}
						/>
					</div>
				))}
			</Document>

			{selectedText && (
				<div className="fixed bottom-4 right-4 p-4 bg-white shadow-lg rounded-lg max-w-md z-20">
					<p className="font-bold">Selected Text:</p>
					<p>{selectedText}</p>
					<button
						onClick={() => setSelectedText("")}
						className="mt-2 px-2 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
					>
						Dismiss
					</button>
				</div>
			)}
		</div>
	);
}
