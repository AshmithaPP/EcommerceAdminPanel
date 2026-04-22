export const calculateGSTFields = (sellingPrice, gstPercent, includesGST) => {
    const sp = parseFloat(sellingPrice) || 0;
    const gst = parseFloat(gstPercent) || 0;
    
    if (includesGST) {
      const basePrice = sp / (1 + (gst / 100));
      return {
        basePrice: basePrice.toFixed(2),
        gstAmount: (sp - basePrice).toFixed(2),
        finalPrice: sp.toFixed(2)
      };
    } else {
      const gstAmount = sp * (gst / 100);
      return {
        basePrice: sp.toFixed(2),
        gstAmount: gstAmount.toFixed(2),
        finalPrice: (sp + gstAmount).toFixed(2)
      };
    }
  };
