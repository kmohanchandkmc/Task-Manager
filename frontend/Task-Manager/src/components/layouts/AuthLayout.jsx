import React from "react";
import LOGO from '../../assets/images/Zidio_logo.png';

const AuthLayout = ({children}) => {
  return <div className="flex w-full h-screen items-center justify-center">
      <div className="w-[90%] max-w-sm md:max-w-md lg:max-w-md p-5 bg-[#5edbeec5] flex-col flex
      item-center gap-3 rounded-xl shadow-slate-500 shadow-lg h-[90vh]">
      <div className="flex items-center justify-center">
      <img
      src={LOGO}
      className="w-44 gap-4 m-4"
      />
      </div>
      <div className=" flex flex-col gap-3 w-full justify-between">
        {children}
        </div>
      </div>

    </div>
};

export default AuthLayout;