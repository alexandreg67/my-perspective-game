// components/Track.ts

interface TrackProps {
  context: CanvasRenderingContext2D;
  canvasSize: { width: number; height: number };
  currentOffsetY: number;
  nbColumns: number;
}

const transformPerspective = (
  x: number,
  y: number,
  perspectivePointX: number,
  perspectivePointY: number,
  height: number
): [number, number] => {
  const linY = y / height;
  const factorY = Math.pow(linY, 3);
  const diffX = x - perspectivePointX;
  const offsetX = diffX * factorY;
  const trX = perspectivePointX + offsetX;
  const trY = perspectivePointY + factorY * (height - perspectivePointY);
  return [trX, trY];
};

export default function drawTrack({
  context,
  canvasSize,
  currentOffsetY,
  nbColumns,
}: TrackProps) {
  const { width, height } = canvasSize;

  context.clearRect(0, 0, width, height); // Effacer le canvas avant de dessiner

  const perspectivePointX = width / 2;
  const perspectivePointY = height * 0.2;
  const lineColor = "white";

  // Dessiner les lignes verticales
  const spacingX = width / nbColumns;
  context.beginPath();
  context.strokeStyle = lineColor;

  for (let i = 0; i <= nbColumns; i++) {
    const lineX = i * spacingX;
    const [x1, y1] = transformPerspective(
      lineX,
      height,
      perspectivePointX,
      perspectivePointY,
      height
    );
    const [x2, y2] = transformPerspective(
      lineX,
      0,
      perspectivePointX,
      perspectivePointY,
      height
    );
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
  }
  context.stroke();

  // Dessiner les lignes horizontales
  const hNbLines = 8;
  const hLineSpacing = 0.15;
  const spacingY = hLineSpacing * height;
  context.beginPath();
  context.strokeStyle = lineColor;

  for (let i = 0; i < hNbLines; i++) {
    const lineY = height - i * spacingY + currentOffsetY;
    const [x1, y1] = transformPerspective(
      0,
      lineY,
      perspectivePointX,
      perspectivePointY,
      height
    );
    const [x2, y2] = transformPerspective(
      width,
      lineY,
      perspectivePointX,
      perspectivePointY,
      height
    );
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
  }
  context.stroke();
}
