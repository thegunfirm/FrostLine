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
    } catch (error) {
      console.error('Error searching RSR products:', error);
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
}

export const rsrAPI = new RSRAPIService();