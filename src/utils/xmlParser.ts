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
    qtdPecas: number;
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

    // 1. Marca (limpeza básica)
    let marca = getElementValue("//nfe:emit/nfe:xFant") || getElementValue("//nfe:emit/nfe:xNome") ||
        getElementValue("//emit/xFant") || getElementValue("//emit/xNome");

    if (marca) {
        marca = marca.replace(/CONFECCOES|LTDA|S\/A|EIRELI|ME|EPP|IMPORTACAO|EXPORTACAO/gi, '').trim();
    }

    // 2. Valor Total
    const valorTotalStr = getElementValue("//nfe:total/nfe:ICMSTot/nfe:vNF") || getElementValue("//total/ICMSTot/vNF");
    const valorTotal = parseFloat(valorTotalStr) || 0;

    // 3. Data Emissao
    const dhEmi = getElementValue("//nfe:ide/nfe:dhEmi") || getElementValue("//ide/dhEmi") || getElementValue("//nfe:ide/nfe:dEmi") || getElementValue("//ide/dEmi");
    const dataEmissao = dhEmi ? dhEmi.substring(0, 10) : new Date().toISOString().substring(0, 10);

    // 4. Quantidade de Peças (Soma de qCom)
    let qtdPecas = 0;
    const itensResult = xmlDoc.evaluate("//nfe:det/nfe:prod/nfe:qCom", xmlDoc, nsResolver, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
    let itemNode = itensResult.iterateNext();

    if (!itemNode) {
        const fallbackItens = xmlDoc.evaluate("//det/prod/qCom", xmlDoc, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
        itemNode = fallbackItens.iterateNext();
    }

    while (itemNode) {
        qtdPecas += parseFloat(itemNode.textContent || '0');
        // @ts-ignore
        itemNode = itensResult.iterateNext();
    }

    // Se XPath falhou, tenta getElementsByTagName
    if (qtdPecas === 0) {
        const qComNodes = xmlDoc.getElementsByTagName("qCom");
        for (let i = 0; i < qComNodes.length; i++) {
            qtdPecas += parseFloat(qComNodes[i].textContent || '0');
        }
    }

    // 5. Parcelas (dup)
    const parcelas: ParsedNfe['parcelas'] = [];
    const duplicatasResult = xmlDoc.evaluate("//nfe:cobr/nfe:dup", xmlDoc, nsResolver, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
    let dupNode = duplicatasResult.iterateNext();

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
        dupNode = duplicatasResult.iterateNext();
    }

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

    let prazoEstimado = 180;
    if (parcelas.length > 0) {
        const lastVenc = new Date(parcelas[parcelas.length - 1].vencimento);
        const emiDate = new Date(dataEmissao);
        const diffTime = Math.abs(lastVenc.getTime() - emiDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        prazoEstimado = Math.max(30, Math.round(diffDays / 30) * 30);
    }

    return {
        marca,
        valorTotal,
        dataEmissao,
        parcelas,
        prazoEstimado,
        qtdPecas
    };
}
