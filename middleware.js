export default function middleware(request) {
  // Otorga acceso público inmediato a cualquier petición
  return new Response(null, {
    headers: { 'x-middleware-next': '1' }
  });
}
