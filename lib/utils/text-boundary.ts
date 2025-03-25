interface Point {
  x: number;
  y: number;
}

interface TextBoundary {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface BoundaryOptions {
  padding: {
    horizontal: number;
    vertical: number;
  };
  maxWidth?: number;
}

interface TextOptions {
  alignment: 'left' | 'center' | 'right';
  verticalAlignment: 'top' | 'middle' | 'bottom';
  fontSize: number;
  fontFamily: string;
  maxWidth?: number;
}

// Get actual text measurements using canvas
function getMeasuredTextWidth(text: string, fontSize: number, fontFamily: string): number {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return 0;
  
  context.font = `${fontSize}px ${fontFamily}`;
  return context.measureText(text).width;
}

// Break text into lines based on maxWidth
function breakTextIntoLines(text: string, fontSize: number, fontFamily: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = words[0];

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return [text];

  context.font = `${fontSize}px ${fontFamily}`;

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = context.measureText(`${currentLine} ${word}`).width;
    if (width < maxWidth) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);
  return lines;
}

// Calculate text boundary with actual measurements and options
export function calculateTextBoundary(
  text: string,
  x: number,
  y: number,
  options: TextOptions,
  boundaryOptions: BoundaryOptions
): TextBoundary {
  const lines = boundaryOptions.maxWidth 
    ? breakTextIntoLines(text, options.fontSize, options.fontFamily, boundaryOptions.maxWidth)
    : [text];

  // Get the widest line
  const width = Math.max(
    ...lines.map(line => getMeasuredTextWidth(line, options.fontSize, options.fontFamily))
  );
  const height = options.fontSize * lines.length * 1.2; // 1.2 is the line height factor

  // Calculate position based on alignment
  let xPos = x;
  if (options.alignment === 'center') {
    xPos -= width / 2;
  } else if (options.alignment === 'right') {
    xPos -= width;
  }

  let yPos = y;
  if (options.verticalAlignment === 'middle') {
    yPos -= height / 2;
  } else if (options.verticalAlignment === 'bottom') {
    yPos -= height;
  }

  // Add padding
  xPos -= boundaryOptions.padding.horizontal;
  yPos -= boundaryOptions.padding.vertical;
  const totalWidth = width + (boundaryOptions.padding.horizontal * 2);
  const totalHeight = height + (boundaryOptions.padding.vertical * 2);

  return {
    x: xPos,
    y: yPos,
    width: totalWidth,
    height: totalHeight
  };
}

// Find the nearest point on a rectangle boundary to another point
export function findNearestBoundaryPoint(boundary: TextBoundary, point: Point): Point {
  // Calculate center of the boundary
  const centerX = boundary.x + boundary.width / 2;
  const centerY = boundary.y + boundary.height / 2;

  // Vector from center to target point
  const dx = point.x - centerX;
  const dy = point.y - centerY;

  // Calculate the angle of the vector
  const angle = Math.atan2(dy, dx);

  // Calculate intersection points with all four sides
  const intersections: Point[] = [];

  // Right side
  if (dx > 0) {
    intersections.push({
      x: boundary.x + boundary.width,
      y: centerY + (boundary.width / 2) * Math.tan(angle)
    });
  }
  // Left side
  if (dx < 0) {
    intersections.push({
      x: boundary.x,
      y: centerY - (boundary.width / 2) * Math.tan(angle)
    });
  }
  // Bottom side
  if (dy > 0) {
    intersections.push({
      x: centerX + (boundary.height / 2) * (1 / Math.tan(angle)),
      y: boundary.y + boundary.height
    });
  }
  // Top side
  if (dy < 0) {
    intersections.push({
      x: centerX - (boundary.height / 2) * (1 / Math.tan(angle)),
      y: boundary.y
    });
  }

  // Find the intersection point that's actually on the boundary and closest to the target
  let nearestPoint: Point = { x: centerX, y: centerY };
  let minDistance = Number.MAX_VALUE;

  intersections.forEach(intersection => {
    // Check if the intersection point is actually on the boundary
    if (
      intersection.x >= boundary.x &&
      intersection.x <= boundary.x + boundary.width &&
      intersection.y >= boundary.y &&
      intersection.y <= boundary.y + boundary.height
    ) {
      const distance = Math.sqrt(
        Math.pow(point.x - intersection.x, 2) + Math.pow(point.y - intersection.y, 2)
      );
      if (distance < minDistance) {
        minDistance = distance;
        nearestPoint = intersection;
      }
    }
  });

  return nearestPoint;
}

// Calculate connection points between node and signal with new options
export function calculateConnectionPoints(
  nodeText: string,
  nodeX: number,
  nodeY: number,
  signalText: string,
  signalX: number,
  signalY: number
): { start: Point; end: Point; signalLines: string[] } {
  const nodeOptions: TextOptions = {
    fontSize: 16,
    fontFamily: 'sans-serif',
    alignment: 'center',
    verticalAlignment: 'middle'
  };

  const signalOptions: TextOptions = {
    fontSize: 14,
    fontFamily: 'sans-serif',
    alignment: 'center',
    verticalAlignment: 'middle',
    maxWidth: 150 // Maximum width for signals before breaking into lines
  };

  const boundaryOptions: BoundaryOptions = {
    padding: {
      horizontal: 10,
      vertical: 10
    },
    maxWidth: signalOptions.maxWidth
  };

  const nodeBoundary = calculateTextBoundary(nodeText, nodeX, nodeY, nodeOptions, boundaryOptions);
  const signalBoundary = calculateTextBoundary(signalText, signalX, signalY, signalOptions, boundaryOptions);

  const start = findNearestBoundaryPoint(nodeBoundary, { x: signalX, y: signalY });
  const end = findNearestBoundaryPoint(signalBoundary, { x: nodeX, y: nodeY });

  // Get signal text lines for rendering
  const signalLines = breakTextIntoLines(
    signalText,
    signalOptions.fontSize,
    signalOptions.fontFamily,
    signalOptions.maxWidth || 0
  );

  return { start, end, signalLines };
} 