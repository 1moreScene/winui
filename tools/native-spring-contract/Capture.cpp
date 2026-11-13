#include <windows.h>
#include <d3d11.h>
#include <dxgi1_2.h>
#include <windows.graphics.capture.interop.h>
#include <windows.graphics.directx.direct3d11.interop.h>
#include <winrt/Windows.Foundation.h>
#include <winrt/Windows.Graphics.Capture.h>
#include <winrt/Windows.Graphics.DirectX.h>
#include <winrt/Windows.Graphics.DirectX.Direct3D11.h>
#include <mutex>
#include <deque>
using namespace winrt;
using namespace winrt::Windows::Graphics::Capture;
struct Sample{double time;int blue;};
static std::mutex gate;static std::deque<Sample> samples;
static com_ptr<ID3D11Device> dev;static com_ptr<ID3D11DeviceContext> ctx;
static Direct3D11CaptureFramePool pool{nullptr};static GraphicsCaptureSession session{nullptr};
static winrt::event_token token{};
static com_ptr<ID3D11Texture2D> staging;static UINT sw=0,sh=0;
extern "C" __declspec(dllexport) int __cdecl BeginCapture(HWND window){try{
 samples.clear();check_hresult(D3D11CreateDevice(nullptr,D3D_DRIVER_TYPE_HARDWARE,nullptr,D3D11_CREATE_DEVICE_BGRA_SUPPORT,nullptr,0,D3D11_SDK_VERSION,dev.put(),nullptr,ctx.put()));
 auto dxgi=dev.as<IDXGIDevice>();com_ptr<IInspectable> insp;check_hresult(CreateDirect3D11DeviceFromDXGIDevice(dxgi.get(),insp.put()));auto device=insp.as<winrt::Windows::Graphics::DirectX::Direct3D11::IDirect3DDevice>();
 GraphicsCaptureItem item{nullptr};auto factory=get_activation_factory<GraphicsCaptureItem,IGraphicsCaptureItemInterop>();check_hresult(factory->CreateForWindow(window,guid_of<GraphicsCaptureItem>(),put_abi(item)));
 pool=Direct3D11CaptureFramePool::CreateFreeThreaded(device,winrt::Windows::Graphics::DirectX::DirectXPixelFormat::B8G8R8A8UIntNormalized,3,item.Size());
 token=pool.FrameArrived([](auto const& sender,auto const&){try{
  auto frame=sender.TryGetNextFrame();if(!frame)return;
  auto access=frame.Surface().as<::Windows::Graphics::DirectX::Direct3D11::IDirect3DDxgiInterfaceAccess>();com_ptr<ID3D11Texture2D> texture;check_hresult(access->GetInterface(__uuidof(ID3D11Texture2D),texture.put_void()));
  D3D11_TEXTURE2D_DESC desc{};texture->GetDesc(&desc);
  if(!staging||sw!=desc.Width||sh!=desc.Height){desc.BindFlags=0;desc.MiscFlags=0;desc.CPUAccessFlags=D3D11_CPU_ACCESS_READ;desc.Usage=D3D11_USAGE_STAGING;check_hresult(dev->CreateTexture2D(&desc,nullptr,staging.put()));sw=desc.Width;sh=desc.Height;}
  ctx->CopyResource(staging.get(),texture.get());D3D11_MAPPED_SUBRESOURCE data{};check_hresult(ctx->Map(staging.get(),0,D3D11_MAP_READ,0,&data));
  auto px=static_cast<unsigned char*>(data.pData)+min(32u,sh-1)*data.RowPitch+min(32u,sw-1)*4;int blue=px[0];ctx->Unmap(staging.get(),0);
  auto time=frame.SystemRelativeTime().count()/10000.0;frame.Close();
  std::lock_guard lock(gate);samples.push_back({time,blue});if(samples.size()>2048)samples.pop_front();
 }catch(...) {}});
 session=pool.CreateCaptureSession(item);session.IsCursorCaptureEnabled(false);session.StartCapture();return 0;
 }catch(...){return to_hresult();}}
extern "C" __declspec(dllexport) int __cdecl PollCapture(double* time,int* blue){std::lock_guard lock(gate);if(samples.empty())return 0;auto s=samples.front();samples.pop_front();*time=s.time;*blue=s.blue;return 1;}
extern "C" __declspec(dllexport) void __cdecl EndCapture(){try{if(pool)pool.FrameArrived(token);if(session)session.Close();if(pool)pool.Close();session=nullptr;pool=nullptr;}catch(...) {}}
