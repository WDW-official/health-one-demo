import Image from 'next/image';

const AUTH_LOGO_URL =
  'https://res.cloudinary.com/dzn1k1z8r/image/upload/v1780557642/Health_One_App_Logo_rd2zds.png';

export function AuthLogo() {
  return (
    <div className="flex justify-center pb-4">
      <Image
        src={AUTH_LOGO_URL}
        alt="Health One"
        width={420}
        height={160}
        priority
        className="h-auto w-2/3 object-contain"
      />
    </div>
  );
}
