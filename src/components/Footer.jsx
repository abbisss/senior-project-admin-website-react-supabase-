import { FaInstagram, FaFacebookF, FaTiktok, FaWhatsapp } from "react-icons/fa";
import { SiGmail } from "react-icons/si";
function Footer() {
    return (
        <footer className="footer navbar my-footer px-4  mt-5">
            <div className="container d-flex flex-column align-items-center gap-3">
                <span className="text-muted">© 2026 Daherni Nature Admin Web. All rights reserved.</span>

                    <div className="d-flex gap-3 social-icons">
                        <FaInstagram className="social-icon" onClick={() => window.open('https://www.instagram.com', '_blank')} />
                        <FaFacebookF className="social-icon" onClick={() => window.open('https://www.facebook.com', '_blank')} />
                        <FaTiktok className="social-icon" onClick={() => window.open('https://www.tiktok.com', '_blank')} />
                        <FaWhatsapp className="social-icon" onClick={() => window.open('https://wa.me/1234567890', '_blank')} />
                        <SiGmail className="social-icon" onClick={() => window.open('mailto:info@daherni.com', '_blank')} />
                    </div>
                </div>
        </footer>
    )
}
export default Footer;