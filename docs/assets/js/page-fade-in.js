// 引入 html2canvas 库
import html2canvas from 'html2canvas';

// 获取当前页面元素
const target = document.documentElement;

// 截图并保存到临时 canvas 中
html2canvas(target, {
  useCORS: true,
  allowTaint: true,
}).then(canvas => {
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  tempCanvas.getContext('2d').drawImage(canvas, 0, 0);
  
  // 从临时 canvas 中获取起始颜色和结束颜色
  const imageData = tempCanvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
  const startColor = `rgb(${imageData[0]}, ${imageData[1]}, ${imageData[2]})`;
  const endColor = `rgb(${imageData[imageData.length - 4]}, ${imageData[imageData.length - 3]}, ${imageData[imageData.length - 2]})`;
  
  // 生成渐变样式
  const gradientStyle = `linear-gradient(to bottom, ${startColor}, ${endColor})`;

  // 将渐变样式应用到页面背景中
  document.body.style.backgroundImage = gradientStyle;
});
