import flw from '../config/flutterwave';
import { SellerWallet } from '../models/SellerWallet';
import { IUser } from '../models/User';

interface SellerSubaccountInput {
  _id: string;
  email: string;
  phone?: string;
  businessName: string;
  bankCode?: string;
  accountNumber?: string;
  country?: string;
}

export async function createSellerSubaccount(sellerData: SellerSubaccountInput) {
  const payload: any = {
    account_bank: sellerData.bankCode,
    account_number: sellerData.accountNumber,
    business_name: sellerData.businessName,
    business_email: sellerData.email,
    business_contact: sellerData.phone,
    business_contact_mobile: sellerData.phone,
    business_mobile: sellerData.phone,
    country: sellerData.country || 'RW',
    meta: [
      {
        meta_name: 'seller_id',
        meta_value: sellerData._id.toString(),
      },
    ],
    split_type: 'percentage',
    split_value: 0, // Reaglex controls full amount first
  };

  const response = await flw.Subaccount.create(payload);

  if (response.status === 'success') {
    await SellerWallet.findOneAndUpdate(
      { sellerId: sellerData._id },
      {
        flutterwaveSubaccountId: response.data.subaccount_id,
        bankCode: sellerData.bankCode,
        accountNumber: sellerData.accountNumber,
        businessName: sellerData.businessName,
      },
      { upsert: true, new: true }
    );

    return response.data;
  }

  throw new Error(response.message || 'Failed to create Flutterwave subaccount');
}

export async function createSellerMobileMoneySubaccount(sellerData: SellerSubaccountInput & { mobileMoneyNumber: string }) {
  const payload: any = {
    account_bank: 'MPS', // MTN MoMo Rwanda
    account_number: sellerData.mobileMoneyNumber,
    business_name: sellerData.businessName,
    business_email: sellerData.email,
    business_contact: sellerData.phone,
    business_contact_mobile: sellerData.phone,
    business_mobile: sellerData.phone,
    country: sellerData.country || 'RW',
    currency: 'RWF',
    meta: [
      {
        meta_name: 'seller_id',
        meta_value: sellerData._id.toString(),
      },
    ],
    split_type: 'percentage',
    split_value: 0,
  };

  const response = await flw.Subaccount.create(payload);

  if (response.status === 'success') {
    await SellerWallet.findOneAndUpdate(
      { sellerId: sellerData._id },
      {
        flutterwaveSubaccountId: response.data.subaccount_id,
        mobileMoneyNumber: sellerData.mobileMoneyNumber,
        businessName: sellerData.businessName,
      },
      { upsert: true, new: true }
    );

    return response.data;
  }

  throw new Error(response.message || 'Failed to create Flutterwave MoMo subaccount');
}

