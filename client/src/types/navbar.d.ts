declare module '../components/Navbar' {
  import { FC } from 'react';

  export interface NavbarProps {
    onSearch?: (query: string) => void;
  }

  const Navbar: FC<NavbarProps>;
  export default Navbar;
}

