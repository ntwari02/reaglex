declare module '@/components/seller/AddressSearchInput' {
  type AddressValue = {
    lat: number | string;
    lng: number | string;
    address?: string;
    country?: string;
  };

  type AddressSearchInputProps = {
    value: AddressValue;
    onChange: (value: { lat: number | string; lng: number | string; address: string; country: string }) => void;
    placeholder?: string;
    required?: boolean;
  };

  const AddressSearchInput: import('react').FC<AddressSearchInputProps>;
  export default AddressSearchInput;
}
