// components/Ship.ts

interface ShipProps {
  canvasContext: CanvasRenderingContext2D;
  canvasSize: { width: number; height: number };
  shipPosition: number;
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

export default function drawShip({
  canvasContext,
  canvasSize,
  shipPosition,
  nbColumns,
}: ShipProps) {
  const { width, height } = canvasSize;

  const perspectivePointX = width / 2;
  const perspectivePointY = height * 0.2;
  const spacingX = width / nbColumns;

  const shipBottomY = height;
  const shipTopY = height - 50;
  const shipLeftX = shipPosition * spacingX;
  const shipRightX = (shipPosition + 1) * spacingX;

  const [leftX1, bottomY1] = transformPerspective(
    shipLeftX,
    shipBottomY,
    perspectivePointX,
    perspectivePointY,
    height
  );
  const [rightX1, bottomY2] = transformPerspective(
    shipRightX,
    shipBottomY,
    perspectivePointX,
    perspectivePointY,
    height
  );
  const [topX, topY] = transformPerspective(
    (shipLeftX + shipRightX) / 2,
    shipTopY,
    perspectivePointX,
    perspectivePointY,
    height
  );

  canvasContext.beginPath();
  canvasContext.moveTo(topX, topY);
  canvasContext.lineTo(leftX1, bottomY1);
  canvasContext.lineTo(rightX1, bottomY2);
  canvasContext.closePath();
  canvasContext.fillStyle = "white";
  canvasContext.fill();
}
