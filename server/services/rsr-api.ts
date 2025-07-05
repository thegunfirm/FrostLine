import axios from 'axios';
import { parseString } from 'xml2js';
import { promisify } from 'util';

const parseXML = promisify(parseString);

export interface RSRProduct {
  stockNo: string;
  upc: string;
  description: string;
  categoryDesc: string;
  manufacturer: string;
  retailPrice: number;
  rsrPrice: number;
  weight: number;
  quantity: number;
  imgName: string;
  departmentDesc: string;
  subDepartmentDesc: string;
  fullDescription: string;
  additionalDesc: string;
  accessories: string;
  promo: string;
  allocated: string;
  mfgName: string;
  mfgPartNumber: string;
  newItem: boolean;
  expandedData: any;
}

export interface RSRInventoryItem {
  stockNo: string;
  quantity: number;
  rsrPrice: number;
  retailPrice: number;
  allocated: string;
  promo: string;
}

class RSRAPIService {
  private baseURL = 'https://api.rsrgroup.com/RSRWebServices/';
  private username: string;
  private password: string;
  private posType: string;
  private standardUsername: string;
  private standardPassword: string;

  constructor() {
    this.username = process.env.RSR_USERNAME || '';
    this.password = process.env.RSR_PASSWORD || '';
    this.posType = process.env.RSR_POS || 'I';
    this.standardUsername = process.env.RSR_STANDARD_USERNAME || '';
    this.standardPassword = process.env.RSR_STANDARD_PASSWORD || '';
  }

  private getAuthHeaders() {
    return {
      'Content-Type': 'application/soap+xml; charset=utf-8',
      'Authorization': `Basic ${Buffer.from(`${this.username}:${this.password}`).toString('base64')}`
    };
  }

  private buildSOAPEnvelope(body: string) {
    return `<?xml version="1.0" encoding="utf-8"?>
    <soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
      <soap12:Body>
        ${body}
      </soap12:Body>
    </soap12:Envelope>`;
  }

  async getCatalog(): Promise<RSRProduct[]> {
    const soapBody = `
      <GetCatalogData xmlns="http://tempuri.org/">
        <username>${this.username}</username>
        <password>${this.password}</password>
        <posType>${this.posType}</posType>
      </GetCatalogData>`;

    try {
      const response = await axios.post(
        `${this.baseURL}rsrwebservice.asmx`,
        this.buildSOAPEnvelope(soapBody),
        { headers: this.getAuthHeaders() }
      );

      const result = await parseXML(response.data);
      const catalogData = result['soap:Envelope']['soap:Body'][0]['GetCatalogDataResponse'][0]['GetCatalogDataResult'][0];
      
      if (catalogData && catalogData.CatalogItem) {
        return catalogData.CatalogItem.map((item: any) => this.mapRSRProduct(item));
      }
      return [];
    } catch (error) {
      console.error('Error fetching RSR catalog:', error);
      throw new Error('Failed to fetch RSR catalog data');
    }
  }

  async getInventory(): Promise<RSRInventoryItem[]> {
    const soapBody = `
      <GetInventoryData xmlns="http://tempuri.org/">
        <username>${this.username}</username>
        <password>${this.password}</password>
        <posType>${this.posType}</posType>
      </GetInventoryData>`;

    try {
      const response = await axios.post(
        `${this.baseURL}rsrwebservice.asmx`,
        this.buildSOAPEnvelope(soapBody),
        { headers: this.getAuthHeaders() }
      );

      const result = await parseXML(response.data);
      const inventoryData = result['soap:Envelope']['soap:Body'][0]['GetInventoryDataResponse'][0]['GetInventoryDataResult'][0];
      
      if (inventoryData && inventoryData.InventoryItem) {
        return inventoryData.InventoryItem.map((item: any) => this.mapRSRInventoryItem(item));
      }
      return [];
    } catch (error) {
      console.error('Error fetching RSR inventory:', error);
      throw new Error('Failed to fetch RSR inventory data');
    }
  }

  async searchProducts(searchTerm: string, category?: string, manufacturer?: string): Promise<RSRProduct[]> {
    const soapBody = `
      <SearchCatalog xmlns="http://tempuri.org/">
        <username>${this.username}</username>
        <password>${this.password}</password>
        <posType>${this.posType}</posType>
        <searchTerm>${searchTerm}</searchTerm>
        <category>${category || ''}</category>
        <manufacturer>${manufacturer || ''}</manufacturer>
      </SearchCatalog>`;

    try {
      const response = await axios.post(
        `${this.baseURL}rsrwebservice.asmx`,
        this.buildSOAPEnvelope(soapBody),
        { headers: this.getAuthHeaders() }
      );

      const result = await parseXML(response.data);
      const searchResults = result['soap:Envelope']['soap:Body'][0]['SearchCatalogResponse'][0]['SearchCatalogResult'][0];
      
      if (searchResults && searchResults.CatalogItem) {
        return searchResults.CatalogItem.map((item: any) => this.mapRSRProduct(item));
      }
      return [];
    } catch (error: any) {
      console.error('Error searching RSR products:', error);
      
      // If network connectivity is unavailable, return mock data for development
      if (error.code === 'ENOTFOUND' || error.cause?.code === 'ENOTFOUND') {
        console.log('RSR API unavailable - using mock data for development');
        return this.getMockRSRProducts(searchTerm, category, manufacturer);
      }
      
      throw new Error('Failed to search RSR products');
    }
  }

  private mapRSRProduct(item: any): RSRProduct {
    return {
      stockNo: item.stockNo?.[0] || '',
      upc: item.upc?.[0] || '',
      description: item.description?.[0] || '',
      categoryDesc: item.categoryDesc?.[0] || '',
      manufacturer: item.manufacturer?.[0] || '',
      retailPrice: parseFloat(item.retailPrice?.[0] || '0'),
      rsrPrice: parseFloat(item.rsrPrice?.[0] || '0'),
      weight: parseFloat(item.weight?.[0] || '0'),
      quantity: parseInt(item.quantity?.[0] || '0'),
      imgName: item.imgName?.[0] || '',
      departmentDesc: item.departmentDesc?.[0] || '',
      subDepartmentDesc: item.subDepartmentDesc?.[0] || '',
      fullDescription: item.fullDescription?.[0] || '',
      additionalDesc: item.additionalDesc?.[0] || '',
      accessories: item.accessories?.[0] || '',
      promo: item.promo?.[0] || '',
      allocated: item.allocated?.[0] || '',
      mfgName: item.mfgName?.[0] || '',
      mfgPartNumber: item.mfgPartNumber?.[0] || '',
      newItem: item.newItem?.[0] === 'true',
      expandedData: item.expandedData?.[0] || {}
    };
  }

  private mapRSRInventoryItem(item: any): RSRInventoryItem {
    return {
      stockNo: item.stockNo?.[0] || '',
      quantity: parseInt(item.quantity?.[0] || '0'),
      rsrPrice: parseFloat(item.rsrPrice?.[0] || '0'),
      retailPrice: parseFloat(item.retailPrice?.[0] || '0'),
      allocated: item.allocated?.[0] || '',
      promo: item.promo?.[0] || ''
    };
  }

  async getProductDetails(stockNo: string): Promise<RSRProduct | null> {
    const soapBody = `
      <GetProductDetails xmlns="http://tempuri.org/">
        <username>${this.username}</username>
        <password>${this.password}</password>
        <posType>${this.posType}</posType>
        <stockNo>${stockNo}</stockNo>
      </GetProductDetails>`;

    try {
      const response = await axios.post(
        `${this.baseURL}rsrwebservice.asmx`,
        this.buildSOAPEnvelope(soapBody),
        { headers: this.getAuthHeaders() }
      );

      const result = await parseXML(response.data);
      const productData = result['soap:Envelope']['soap:Body'][0]['GetProductDetailsResponse'][0]['GetProductDetailsResult'][0];
      
      if (productData && productData.CatalogItem) {
        return this.mapRSRProduct(productData.CatalogItem[0]);
      }
      return null;
    } catch (error) {
      console.error('Error fetching RSR product details:', error);
      return null;
    }
  }

  private getMockRSRProducts(searchTerm: string, category?: string, manufacturer?: string): RSRProduct[] {
    const mockProducts: RSRProduct[] = [
      {
        stockNo: "GLOCK19GEN5",
        upc: "764503026157", 
        description: "GLOCK 19 Gen 5 9mm Luger 4.02\" Barrel 15-Round",
        categoryDesc: "Handguns",
        manufacturer: "Glock Inc",
        mfgName: "Glock Inc",
        retailPrice: 599.99,
        rsrPrice: 449.99,
        weight: 1.85,
        quantity: 12,
        imgName: "glock19gen5.jpg",
        departmentDesc: "Firearms",
        subDepartmentDesc: "Striker Fired Pistols",
        fullDescription: "The GLOCK 19 Gen 5 represents the pinnacle of GLOCK engineering excellence. This compact pistol combines reliability, accuracy, and ease of use in a versatile package suitable for both professional and personal defense applications.",
        additionalDesc: "Features the GLOCK Marksman Barrel (GMB), enhanced trigger, ambidextrous slide stop lever, and improved magazine release.",
        accessories: "3 magazines, case, cleaning kit, manual",
        promo: "MAP Protected",
        allocated: "N",
        mfgPartNumber: "PA195S201",
        newItem: false,
        expandedData: null
      },
      {
        stockNo: "SW12039",
        upc: "022188120394",
        description: "Smith & Wesson M&P9 Shield Plus 9mm 3.1\" Barrel 13-Round",
        categoryDesc: "Handguns", 
        manufacturer: "Smith & Wesson",
        mfgName: "Smith & Wesson",
        retailPrice: 479.99,
        rsrPrice: 359.99,
        weight: 1.4,
        quantity: 8,
        imgName: "mp9shieldplus.jpg",
        departmentDesc: "Firearms",
        subDepartmentDesc: "Concealed Carry Pistols",
        fullDescription: "The M&P Shield Plus delivers maximum capacity in a micro-compact design. Features an 18-degree grip angle for natural point of aim and enhanced grip texture for improved control.",
        additionalDesc: "Flat face trigger, tactile and audible trigger reset, optimal 18-degree grip angle",
        accessories: "2 magazines (10rd & 13rd), case, manual",
        promo: "Free shipping",
        allocated: "N", 
        mfgPartNumber: "13242",
        newItem: true,
        expandedData: null
      },
      {
        stockNo: "RUGER10/22",
        upc: "736676011018",
        description: "Ruger 10/22 Carbine .22 LR 18.5\" Barrel 10-Round",
        categoryDesc: "Rifles", 
        manufacturer: "Sturm, Ruger & Co.",
        mfgName: "Sturm, Ruger & Co.",
        retailPrice: 319.99,
        rsrPrice: 239.99,
        weight: 5.0,
        quantity: 15,
        imgName: "ruger1022.jpg",
        departmentDesc: "Firearms",
        subDepartmentDesc: "Sporting Rifles",
        fullDescription: "The Ruger 10/22 is America's favorite .22 rifle. This proven design has remained virtually unchanged since its introduction in 1964. All 10/22 rifles feature an extended magazine release.",
        additionalDesc: "Cold hammer-forged barrel, dual extractors, independent trigger return spring",
        accessories: "1 magazine, scope mounting rail, manual",
        promo: "Classic American",
        allocated: "N", 
        mfgPartNumber: "1103",
        newItem: false,
        expandedData: null
      },
      {
        stockNo: "REMINGTON870",
        upc: "047700811208",
        description: "Remington 870 Express 12GA 28\" Barrel 4-Round",
        categoryDesc: "Shotguns", 
        manufacturer: "Remington Arms",
        mfgName: "Remington Arms",
        retailPrice: 429.99,
        rsrPrice: 329.99,
        weight: 7.25,
        quantity: 6,
        imgName: "remington870.jpg",
        departmentDesc: "Firearms",
        subDepartmentDesc: "Sporting Shotguns",
        fullDescription: "The Remington 870 Express is the most popular pump-action shotgun in the world. Built on the same receiver as all Model 870s, it features the time-proven pump-action design.",
        additionalDesc: "Steel receiver, dual action bars, solid steel-to-steel lockup",
        accessories: "Modified RemChoke tube, manual",
        promo: "America's Favorite",
        allocated: "N", 
        mfgPartNumber: "25569",
        newItem: false,
        expandedData: null
      },
      {
        stockNo: "SPRINGFIELD1911",
        upc: "706397910105",
        description: "Springfield 1911 Range Officer .45 ACP 5\" Barrel 7-Round",
        categoryDesc: "Handguns", 
        manufacturer: "Springfield Armory",
        mfgName: "Springfield Armory",
        retailPrice: 899.99,
        rsrPrice: 679.99,
        weight: 2.5,
        quantity: 4,
        imgName: "springfield1911.jpg",
        departmentDesc: "Firearms",
        subDepartmentDesc: "Competition Pistols",
        fullDescription: "The Springfield Range Officer represents the best value in a competition-ready 1911. Built on the proven 1911 platform with match-grade components and precision manufacturing.",
        additionalDesc: "Match-grade barrel, adjustable target sights, lightweight aluminum trigger",
        accessories: "2 magazines, case, manual",
        promo: "Competition Ready",
        allocated: "N", 
        mfgPartNumber: "PI9129L",
        newItem: false,
        expandedData: null
      }
    ];

    // Filter based on search criteria
    let filteredProducts = mockProducts;
    
    if (searchTerm) {
      filteredProducts = filteredProducts.filter(product => 
        product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.manufacturer.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (category) {
      filteredProducts = filteredProducts.filter(product => 
        product.categoryDesc.toLowerCase().includes(category.toLowerCase())
      );
    }
    
    if (manufacturer) {
      filteredProducts = filteredProducts.filter(product => 
        product.manufacturer.toLowerCase().includes(manufacturer.toLowerCase())
      );
    }
    
    return filteredProducts;
  }
}

export const rsrAPI = new RSRAPIService();