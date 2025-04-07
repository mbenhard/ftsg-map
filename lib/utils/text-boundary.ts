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

// Define padding configuration interface
interface PaddingConfig {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

// Define padding configurations for different line counts
interface LineBasedPadding {
  singleLine: PaddingConfig;
  twoLines: PaddingConfig;
  threeOrMore: PaddingConfig;
}

// Default padding configurations
const defaultPadding: LineBasedPadding = {
  singleLine: {
    top: 15,
    right: 18,
    bottom: 10,
    left: 15
  },
  twoLines: {
    top: 8,
    right: 15,
    bottom: 25,
    left: 15
  },
  threeOrMore: {
    top: 1,
    right: 15,
    bottom: 24,
    left: 15
  }
};

interface BoundaryOptions {
  maxWidth?: number;
  padding?: LineBasedPadding;
}

interface TextOptions {
  fontSize: number;
  lineHeight: number;
  fontFamily: string;
  fontWeight: string;
  alignment: 'left' | 'center' | 'right';
  verticalAlignment: 'top' | 'middle' | 'bottom';
  maxWidth?: number;
}

interface ConnectionPoints {
  start: Point;
  end: Point;
  signalLines: string[];
}

const nodeOptions: TextOptions = {
  fontSize: 16,
  lineHeight: 24,
  fontFamily: 'sans-serif',
  fontWeight: 'bold',
  alignment: 'center',
  verticalAlignment: 'middle'
};

const signalOptions: TextOptions = {
  fontSize: 12,
  lineHeight: 18,
  fontFamily: 'sans-serif',
  fontWeight: 'normal',
  alignment: 'center',
  verticalAlignment: 'middle'
};

// Simple text width estimation based on character count and font size
function estimateTextWidth(text: string, fontSize: number): number {
  // Average character width is roughly 60% of the font size
  return text.length * fontSize * 0.6;
}

// Break text into lines based on maxWidth using simple estimation
function breakTextIntoLines(text: string, fontSize: number, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = estimateTextWidth(`${currentLine} ${word}`, fontSize);
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

// Calculate actual text dimensions using canvas
function calculateTextDimensions(text: string, options: TextOptions): { width: number; height: number; lineCount: number } {
  // Create a temporary canvas element
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return { width: 0, height: 0, lineCount: 1 };

  // Set font properties
  context.font = `${options.fontSize}px ${options.fontFamily}`;
  
  // For multiline text, split and measure each line
  const lines = options.maxWidth 
    ? breakTextIntoLines(text, options.fontSize, options.maxWidth)
    : [text];

  // Calculate total width and height
  const lineHeight = options.fontSize * 1.2; // 1.2 is standard line height
  const width = Math.max(...lines.map(line => context.measureText(line).width));
  const height = lines.length * lineHeight;

  return { width, height, lineCount: lines.length };
}

// Calculate padding based on line count and custom configuration
function calculatePadding(
  dimensions: { width: number; height: number; lineCount: number },
  customPadding?: LineBasedPadding
): PaddingConfig {
  const padding = customPadding || defaultPadding;
  
  if (dimensions.lineCount === 1) {
    return padding.singleLine;
  } else if (dimensions.lineCount === 2) {
    return padding.twoLines;
  } else {
    return padding.threeOrMore;
  }
}

// Calculate text boundary with estimated measurements and options
export function calculateTextBoundary(
  text: string,
  x: number,
  y: number,
  options: TextOptions,
  boundaryOptions: BoundaryOptions
): TextBoundary {
  // Calculate actual text dimensions including line count
  const dimensions = calculateTextDimensions(text, options);
  
  // Calculate padding based on line count and custom configuration
  const padding = calculatePadding(dimensions, boundaryOptions.padding);

  // Calculate position based on alignment
  let xPos = x;
  if (options.alignment === 'center') {
    xPos -= dimensions.width / 2;
  } else if (options.alignment === 'right') {
    xPos -= dimensions.width;
  }

  let yPos = y;
  if (options.verticalAlignment === 'middle') {
    yPos -= dimensions.height / 2;
  } else if (options.verticalAlignment === 'bottom') {
    yPos -= dimensions.height;
  }

  // Apply padding
  xPos -= padding.left;
  yPos -= padding.top;
  
  // Calculate total dimensions including padding
  const totalWidth = dimensions.width + padding.left + padding.right;
  const totalHeight = dimensions.height + padding.top + padding.bottom;

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
): ConnectionPoints {
  // Handle server-side rendering by providing default values
  if (typeof window === 'undefined') {
    return {
      start: { x: nodeX, y: nodeY },
      end: { x: signalX, y: signalY },
      signalLines: [signalText]
    }
  }

  // Create temporary elements for measurement
  const tempNode = document.createElement("div")
  const tempSignal = document.createElement("div")
  tempNode.style.position = "absolute"
  tempNode.style.visibility = "hidden"
  tempNode.style.whiteSpace = "pre-wrap"
  tempNode.style.width = "200px"
  tempNode.style.fontSize = `${nodeOptions.fontSize}px`
  tempNode.style.lineHeight = `${nodeOptions.lineHeight}px`
  tempNode.style.fontFamily = nodeOptions.fontFamily
  tempNode.style.fontWeight = nodeOptions.fontWeight
  tempNode.style.textAlign = "center"
  tempNode.textContent = nodeText

  tempSignal.style.position = "absolute"
  tempSignal.style.visibility = "hidden"
  tempSignal.style.whiteSpace = "pre-wrap"
  tempSignal.style.width = "200px"
  tempSignal.style.fontSize = `${signalOptions.fontSize}px`
  tempSignal.style.lineHeight = `${signalOptions.lineHeight}px`
  tempSignal.style.fontFamily = signalOptions.fontFamily
  tempSignal.style.fontWeight = signalOptions.fontWeight
  tempSignal.style.textAlign = "center"
  tempSignal.textContent = signalText

  document.body.appendChild(tempNode)
  document.body.appendChild(tempSignal)

  // Get dimensions
  const nodeRect = tempNode.getBoundingClientRect()
  const signalRect = tempSignal.getBoundingClientRect()

  // Clean up
  document.body.removeChild(tempNode)
  document.body.removeChild(tempSignal)

  // Calculate connection points
  const nodeWidth = nodeRect.width
  const nodeHeight = nodeRect.height
  const signalWidth = signalRect.width
  const signalHeight = signalRect.height

  // Calculate the angle between node and signal
  const dx = signalX - nodeX
  const dy = signalY - nodeY
  const angle = Math.atan2(dy, dx)

  // Calculate start point (node edge)
  const nodeRadius = Math.sqrt(nodeWidth * nodeWidth + nodeHeight * nodeHeight) / 2
  const startX = nodeX + Math.cos(angle) * nodeRadius
  const startY = nodeY + Math.sin(angle) * nodeRadius

  // Calculate end point (signal edge)
  const signalRadius = Math.sqrt(signalWidth * signalWidth + signalHeight * signalHeight) / 2
  const endX = signalX - Math.cos(angle) * signalRadius
  const endY = signalY - Math.sin(angle) * signalRadius

  // Split signal text into lines
  const signalLines = signalText.split("\n")

  return {
    start: { x: startX, y: startY },
    end: { x: endX, y: endY },
    signalLines
  }
} 