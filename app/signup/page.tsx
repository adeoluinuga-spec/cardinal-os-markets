import { SignupForm } from "./SignupForm";

type SignupPageProps = {
  searchParams: {
    association?: string;
  };
};

export default function SignupPage({ searchParams }: SignupPageProps) {
  return <SignupForm initialAssociation={searchParams.association ?? ""} />;
}
