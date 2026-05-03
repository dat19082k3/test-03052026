import type { PoolClient } from 'pg';
import * as inventoryRepository from '@repo/db';
import { pool } from '../config/database';

function executor(client?: PoolClient) {
  return client || pool;
}

export type FindVouchersOptions = inventoryRepository.FindVouchersOptions;
export type InsertVoucherParams = inventoryRepository.InsertVoucherParams;
export type InsertDetailParams = inventoryRepository.InsertDetailParams;

export function findWarehouseById(id: string, client?: PoolClient) {
  return inventoryRepository.findWarehouseById(executor(client), id);
}

export function findItemById(id: string, client?: PoolClient) {
  return inventoryRepository.findItemById(executor(client), id);
}

export function findVoucherByNumber(voucherNumber: string, client?: PoolClient) {
  return inventoryRepository.findVoucherByNumber(executor(client), voucherNumber);
}

export function getLatestVoucherNumber(prefix: string, client?: PoolClient) {
  return inventoryRepository.getLatestVoucherNumber(executor(client), prefix);
}

export function findVoucherById(id: string, client?: PoolClient) {
  return inventoryRepository.findVoucherById(executor(client), id);
}

export function findVoucherByIdForUpdate(id: string, client: PoolClient) {
  return inventoryRepository.findVoucherByIdForUpdate(client, id);
}

export function findVoucherDetailsById(voucherId: string, client?: PoolClient) {
  return inventoryRepository.findVoucherDetailsById(executor(client), voucherId);
}

export function findVouchers(options: FindVouchersOptions) {
  return inventoryRepository.findVouchers(pool, options);
}

export function insertVoucher(params: InsertVoucherParams, client: PoolClient) {
  return inventoryRepository.insertVoucher(client, params);
}

export function insertVoucherDetails(details: InsertDetailParams[], client: PoolClient) {
  return inventoryRepository.insertVoucherDetails(client, details);
}

export function updateVoucherFields(
  id: string,
  params: Partial<InsertVoucherParams> & { updated_by?: string },
  client: PoolClient,
) {
  return inventoryRepository.updateVoucherFields(client, id, params);
}

export function deleteVoucherDetails(voucherId: string, client: PoolClient) {
  return inventoryRepository.deleteVoucherDetails(client, voucherId);
}

export function updateVoucherStatus(
  id: string,
  params: { status: 'posted' | 'cancelled'; cancel_reason?: string; cancelled_by?: string },
  client: PoolClient,
) {
  return inventoryRepository.updateVoucherStatus(client, id, params);
}

export function hardDeleteVoucher(id: string, client: PoolClient) {
  return inventoryRepository.hardDeleteVoucher(client, id);
}

export { pool };
