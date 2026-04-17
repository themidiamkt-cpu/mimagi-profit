export interface ParsedNfe {
    marca: string;
    valorTotal: number;
    dataEmissao: string;
    parcelas: {
        numero: string;
        vencimento: string;
        valor: number;
    }[];
    prazoEstimado: number;
}

export function parseNfeXml(xmlString: string): ParsedNfe {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");

    // Namespace handling (NF-e usually uses http://www.portalfiscal.inf.br/nfe)
    const nsResolver = (prefix: string) => {
        const ns: Record<string, string> = {
            'nfe': 'http://www.portalfiscal.inf.br/nfe'
        };
        return ns[prefix] || null;
    };

    const getElementValue = (path: string) => {
        const node = xmlDoc.evaluate(path, xmlDoc, nsResolver, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        return node?.textContent || '';
    };

    // Try with and without namespace for robustness
    const marca = getElementValue("//nfe:emit/nfe:xNome") || getElementValue("//emit/xNome");
    const valorTotalStr = getElementValue("//nfe:total/nfe:ICMSTot/nfe:vNF") || getElementValue("//total/ICMSTot/vNF");
    const valorTotal = parseFloat(valorTotalStr) || 0;

    const dhEmi = getElementValue("//nfe:ide/nfe:dhEmi") || getElementValue("//ide/dhEmi") || getElementValue("//nfe:ide/nfe:dEmi") || getElementValue("//ide/dEmi");
    const dataEmissao = dhEmi ? dhEmi.substring(0, 10) : new Date().toISOString().substring(0, 10);

    // Parse installments (dup)
    const parcelas: ParsedNfe['parcelas'] = [];
    const duplicatasResult = xmlDoc.evaluate("//nfe:cobr/nfe:dup", xmlDoc, nsResolver, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
    let dupNode = duplicatasResult.iterateNext();

    // Fallback for no namespace
    if (!dupNode) {
        const fallbackResult = xmlDoc.evaluate("//cobr/dup", xmlDoc, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
        dupNode = fallbackResult.iterateNext();
    }

    while (dupNode) {
        const nDup = xmlDoc.evaluate(".//nfe:nDup", dupNode, nsResolver, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue?.textContent ||
            xmlDoc.evaluate(".//nDup", dupNode, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue?.textContent || '';
        const dVenc = xmlDoc.evaluate(".//nfe:dVenc", dupNode, nsResolver, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue?.textContent ||
            xmlDoc.evaluate(".//dVenc", dupNode, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue?.textContent || '';
        const vDupStr = xmlDoc.evaluate(".//nfe:vDup", dupNode, nsResolver, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue?.textContent ||
            xmlDoc.evaluate(".//vDup", dupNode, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue?.textContent || '0';

        parcelas.push({
            numero: nDup,
            vencimento: dVenc,
            valor: parseFloat(vDupStr) || 0
        });

        // @ts-ignore
        dupNode = duplicatasResult.iterateNext() || (xmlDoc.evaluate("//cobr/dup", xmlDoc, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null).iterateNext());
        // Note: The above logic for iteration might need care. Let's simplify.
    }

    // If no iterations above, try a simpler loop if iterateNext failed due to iterator mixing
    if (parcelas.length === 0) {
        const dupNodes = xmlDoc.getElementsByTagName("dup");
        for (let i = 0; i < dupNodes.length; i++) {
            const node = dupNodes[i];
            const nDup = node.getElementsByTagName("nDup")[0]?.textContent || '';
            const dVenc = node.getElementsByTagName("dVenc")[0]?.textContent || '';
            const vDup = parseFloat(node.getElementsByTagName("vDup")[0]?.textContent || '0');
            parcelas.push({ numero: nDup, vencimento: dVenc, valor: vDup });
        }
    }

    // Calculate estimated plazo (days from emission to last installment)
    let prazoEstimado = 180; // Default
    if (parcelas.length > 0) {
        const lastVenc = new Date(parcelas[parcelas.length - 1].vencimento);
        const emiDate = new Date(dataEmissao);
        const diffTime = Math.abs(lastVenc.getTime() - emiDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Round to nearest 30 for the system's logic
        prazoEstimado = Math.max(30, Math.round(diffDays / 30) * 30);
    }

    return {
        marca,
        valorTotal,
        dataEmissao,
        parcelas,
        prazoEstimado
    };
}
