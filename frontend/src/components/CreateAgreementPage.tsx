import CreateAgreement from './CreateAgreement'

export default function CreateAgreementPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-4xl font-semibold sm:text-5xl">Create an agreement</h1>
      <p className="mt-3 max-w-[56ch] text-lg text-mute">
        You are the client. Set who is involved and what each milestone pays. Nothing is paid until everyone has accepted and you fund it.
      </p>
      <div className="mt-10"><CreateAgreement /></div>
    </div>
  )
}
